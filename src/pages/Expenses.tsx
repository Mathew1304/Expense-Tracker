import React, { useState, useEffect } from "react";
import { Plus, Search, X, Trash, CreditCard as Edit2, TrendingUp, TrendingDown, Calendar, Download, Link as LinkIcon, FileText, Calculator, QrCode, Eye, CircleCheck as CheckCircle, Clock, Circle as XCircle, Upload, FileDown, CircleAlert as AlertCircle } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import Papa from "papaparse";
import { downloadCSVTemplate, parseCSVFile, validateCSVData, mapCSVRowsToExpenses, ValidationError } from "../lib/csvUtils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Transaction {
  id: string;
  phase_id: string;
  category: string;
  amount: number;
  gst_amount?: number;
  date: string;
  phase_name: string;
  project_name: string;
  payment_method: string;
  bill_path: string | null;
  type: 'expense' | 'income';
}

interface Phase {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
}

interface Project {
  id: string;
  name: string;
}

interface ChartData {
  date: string;
  expense: number;
  income: number;
}

interface PaymentLink {
  id: string;
  business_name: string;
  product_name: string;
  amount: number;
  quantity: number;
  description: string;
  gst_number: string;
  gst_rate: number;
  razorpay_link_id: string;
  razorpay_link_url: string;
  razorpay_qr_code?: string;
  status: 'active' | 'inactive';
  payment_status: 'pending' | 'paid' | 'failed';
  created_at: string;
  updated_at: string;
}

const EXPENSE_CATEGORY_OPTIONS = [
  "Labour",
  "Materials",
  "Machinery",
  "Vendor Payment",
  "Consultancy Fees",
  "Government Fees",
  "Electrical",
  "Plumbing",
  "Painting",
  "Tiles & Flooring",
  "Carpentry & Woodwork",
  "Site Expenses",
  "Transport",
  "Miscellaneous",
];

const INCOME_CATEGORY_OPTIONS = [
  "Client Payment",
  "Advance Payment",
  "Milestone Payment",
  "Final Payment",
  "Additional Work Payment",
  "Material Refund",
  "Insurance Claim",
  "Government Subsidy",
  "Loan Disbursement",
  "Other Income",
];

const PAYMENT_OPTIONS = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

// Razorpay configuration
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = import.meta.env.VITE_RAZORPAY_KEY_SECRET;

export function Expenses() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPaymentLinkForm, setShowPaymentLinkForm] = useState(false);
  const [showPaymentLinksTable, setShowPaymentLinksTable] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTransaction, setDetailsTransaction] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showGstModal, setShowGstModal] = useState(false);
  const [gstAmount, setGstAmount] = useState("");
  const [formData, setFormData] = useState({
    projectId: "",
    phaseId: "",
    category: "",
    amount: "",
    paymentMethod: "",
    date: "",
    billFile: null as File | null,
    includeGst: false,
    gstAmount: "",
  });
  const [paymentLinkData, setPaymentLinkData] = useState({
    businessName: "",
    productName: "",
    amount: "",
    quantity: "1",
    description: "",
    gstNumber: "",
    gstRate: "18",
    includeGst: false,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validRowCount, setValidRowCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProjects();
    fetchPaymentLinks();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchPhases();
      fetchTransactions();
    }
  }, [projects]);

  async function fetchProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("created_by", user?.id);

    if (!error && data) setProjects(data);
  }

  async function fetchPhases() {
    if (projects.length === 0) return;

    const { data, error } = await supabase
      .from("phases")
      .select("id, name, project_id, projects (id, name)")
      .in(
        "project_id",
        projects.map((p) => p.id)
      );

    if (!error && data) {
      setPhases(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          project_id: p.project_id,
          project_name: p.projects?.name || "No Project",
        }))
      );
    }
  }

  async function fetchTransactions() {
    if (projects.length === 0) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("expenses")
      .select(
        `id, phase_id, category, amount, gst_amount, date, payment_method, bill_path, type,
        phases (id, name, project_id, projects (id, name))`
      )
      .in(
        "project_id",
        projects.map((p) => p.id)
      )
      .order("date", { ascending: false });

    if (!error && data) {
      setTransactions(
        data.map((e: any) => ({
          id: e.id,
          phase_id: e.phase_id,
          category: e.category,
          amount: e.amount,
          gst_amount: e.gst_amount || 0,
          date: e.date,
          payment_method: e.payment_method,
          bill_path: e.bill_path,
          type: e.type || 'expense',
          phase_name: e.phases?.name || "No Phase",
          project_name: e.phases?.projects?.name || "No Project",
        }))
      );
    }
    setLoading(false);
  }

  async function fetchPaymentLinks() {
    const { data, error } = await supabase
      .from("payment_links")
      .select("*")
      .eq("created_by", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPaymentLinks(data);
    }
  }

  // CSV Export functionality with fixed date formatting
  const exportToCSV = () => {
    const csvData = filteredTransactions.map(t => ({
      'Type': t.type === 'income' ? 'Income' : 'Expense',
      'Project': t.project_name,
      'Phase': t.phase_name,
      'Category': t.category,
      'Amount': t.amount,
      'GST Amount': t.gst_amount || 0,
      'Total Amount': t.amount + (t.gst_amount || 0),
      'Payment Method': t.payment_method,
      'Date': format(new Date(t.date), "dd/MM/yyyy"),
      'Bill': t.bill_path ? 'Yes' : 'No'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    setValidationErrors([]);
    setValidRowCount(0);

    try {
      const rows = await parseCSVFile(file);
      const validation = validateCSVData(rows, projects, phases);

      setValidationErrors(validation.errors);
      setValidRowCount(validation.validRows);

      if (validation.isValid) {
        setSuccessMessage(`CSV file is valid! ${validation.validRows} rows ready to upload.`);
      } else {
        setErrorMessage(`CSV validation failed. ${validation.errors.length} errors found. Please fix them before uploading.`);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setErrorMessage('Failed to parse CSV file. Please check the file format.');
    }
  };

  const handleBulkUpload = async () => {
    if (!csvFile || validationErrors.length > 0) {
      setErrorMessage('Please fix all validation errors before uploading');
      return;
    }

    setUploadingFile(true);

    try {
      const rows = await parseCSVFile(csvFile);
      const expenseData = mapCSVRowsToExpenses(rows, projects, phases, user?.id || '');

      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select();

      if (error) throw error;

      setSuccessMessage(`Successfully uploaded ${data.length} transactions!`);
      setCsvFile(null);
      setValidationErrors([]);
      setValidRowCount(0);
      setShowBulkUploadModal(false);

      await fetchTransactions();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error uploading expenses:', error);
      setErrorMessage('Failed to upload expenses. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Create a simple payment link without Razorpay API (for testing)
  const createSimplePaymentLink = async () => {
    setCreatingPaymentLink(true);
    try {
      const baseAmount = parseFloat(paymentLinkData.amount);
      const quantity = parseInt(paymentLinkData.quantity);
      const gstRate = parseFloat(paymentLinkData.gstRate);
      const gstAmount = paymentLinkData.includeGst ? baseAmount * quantity * (gstRate / 100) : 0;
      const totalAmount = baseAmount * quantity + gstAmount;

      // Generate a simple payment link ID and URL
      const linkId = `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentUrl = `${window.location.origin}/payment/${linkId}`;

      // Generate QR Code URL
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentUrl)}`;

      // Save to database
      const { error } = await supabase.from('payment_links').insert([{
        business_name: paymentLinkData.businessName,
        product_name: paymentLinkData.productName,
        amount: baseAmount,
        quantity: quantity,
        description: paymentLinkData.description,
        gst_number: paymentLinkData.gstNumber,
        gst_rate: parseFloat(paymentLinkData.gstRate),
        razorpay_link_id: linkId,
        razorpay_link_url: paymentUrl,
        razorpay_qr_code: qrCodeUrl,
        status: 'active',
        payment_status: 'pending',
        created_by: user?.id,
      }]);

      if (!error) {
        fetchPaymentLinks();
        setShowPaymentLinkForm(false);
        resetPaymentLinkForm();
        setSuccessMessage('Payment link created successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        throw new Error('Failed to save payment link to database');
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      setErrorMessage('Error creating payment link. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  // Test payment function
  const testPayment = async (linkId: string) => {
    try {
      // Simulate payment success
      const { error } = await supabase
        .from('payment_links')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('razorpay_link_id', linkId);

      if (!error) {
        fetchPaymentLinks();
        setSuccessMessage('Payment marked as successful!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      setErrorMessage('Error updating payment status');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const resetPaymentLinkForm = () => {
    setPaymentLinkData({
      businessName: "",
      productName: "",
      amount: "",
      quantity: "1",
      description: "",
      gstNumber: "",
      gstRate: "18",
      includeGst: false,
    });
  };

  // Generate Invoice PDF with better template
  const generateInvoice = () => {
    const doc = new jsPDF();
    const currentDate = format(new Date(), "dd-MM-yyyy");
    const baseAmount = parseFloat(paymentLinkData.amount || '0');
    const quantity = parseInt(paymentLinkData.quantity || '1');
    const gstRate = parseFloat(paymentLinkData.gstRate || '0');
    const subtotal = baseAmount * quantity;
    const gstAmount = paymentLinkData.includeGst ? subtotal * (gstRate / 100) : 0;
    const totalAmount = subtotal + gstAmount;

    // Header with company info
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(paymentLinkData.businessName || 'Your Business Name', 20, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Email: info@yourbusiness.com | Phone: +91 XXXXX XXXXX', 20, 35);
    doc.text(`GST No: ${paymentLinkData.gstNumber || 'Not Provided'}`, 20, 42);

    // Invoice title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', 20, 60);

    // Invoice details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: INV-${Date.now().toString().slice(-6)}`, 20, 75);
    doc.text(`Invoice Date: ${currentDate}`, 20, 82);
    doc.text(`Due Date: ${format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "dd-MM-yyyy")}`, 20, 89);

    // Bill to section
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Customer Name', 20, 115);
    doc.text('Customer Address', 20, 122);
    doc.text('City, State, PIN Code', 20, 129);

    // Table for items
    const tableData = [];
    const headers = ['Description', 'Unit Price', 'Qty', 'Amount'];

    if (paymentLinkData.includeGst) {
      headers.push('CGST', 'SGST', 'Total');
      tableData.push([
        paymentLinkData.productName || 'Product/Service',
        `₹${baseAmount.toFixed(2)}`,
        quantity.toString(),
        `₹${subtotal.toFixed(2)}`,
        `₹${(gstAmount / 2).toFixed(2)}`,
        `₹${(gstAmount / 2).toFixed(2)}`,
        `₹${totalAmount.toFixed(2)}`
      ]);
    } else {
      headers.push('Total');
      tableData.push([
        paymentLinkData.productName || 'Product/Service',
        `₹${baseAmount.toFixed(2)}`,
        quantity.toString(),
        `₹${subtotal.toFixed(2)}`,
        `₹${totalAmount.toFixed(2)}`
      ]);
    }

    // Generate table
    (doc as any).autoTable({
      startY: 145,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' }
      }
    });

    // Summary section
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Totals
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 140, finalY);

    if (paymentLinkData.includeGst) {
      doc.text(`CGST (${(gstRate / 2)}%): ₹${(gstAmount / 2).toFixed(2)}`, 140, finalY + 8);
      doc.text(`SGST (${(gstRate / 2)}%): ₹${(gstAmount / 2).toFixed(2)}`, 140, finalY + 16);
      doc.text(`Total GST: ₹${gstAmount.toFixed(2)}`, 140, finalY + 24);
    }

    // Draw line
    doc.line(140, finalY + (paymentLinkData.includeGst ? 30 : 10), 190, finalY + (paymentLinkData.includeGst ? 30 : 10));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 140, finalY + (paymentLinkData.includeGst ? 40 : 20));

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business!', 20, 270);
    doc.text('Terms: Payment due within 30 days', 20, 275);

    // Save the PDF
    doc.save(`Invoice_${paymentLinkData.productName?.replace(/[^a-z0-9]/gi, '_') || 'invoice'}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const filteredPhases = phases.filter(
    (p) => !formData.projectId || p.project_id === formData.projectId
  );

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentLinkChange = (field: keyof typeof paymentLinkData, value: string | boolean) => {
    setPaymentLinkData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle GST button click
  const handleGstClick = (includeGst: boolean) => {
    if (includeGst) {
      setShowGstModal(true);
    } else {
      setFormData(prev => ({ ...prev, includeGst: false, gstAmount: "" }));
    }
  };

  // Handle GST modal confirm
  const handleGstConfirm = () => {
    if (!gstAmount || parseFloat(gstAmount) < 0) {
      setErrorMessage("Please enter a valid GST amount");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }
    setFormData(prev => ({
      ...prev,
      includeGst: true,
      gstAmount: gstAmount
    }));
    setShowGstModal(false);
    setGstAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { projectId, phaseId, category, amount, paymentMethod, date, billFile, includeGst, gstAmount } = formData;

    if (!phaseId || !projectId || !category || !paymentMethod) {
      setErrorMessage("Please fill all required fields.");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    let bill_path = null;

    if (billFile) {
      const fileName = `${Date.now()}-${billFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("bills")
        .upload(fileName, billFile);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        setErrorMessage("Failed to upload bill.");
        setTimeout(() => setErrorMessage(null), 5000);
        return;
      }
      bill_path = fileName;
    }

    const payload = {
      project_id: projectId,
      phase_id: phaseId,
      category,
      amount: parseFloat(amount),
      gst_amount: includeGst && gstAmount ? parseFloat(gstAmount) : null,
      date,
      payment_method: paymentMethod,
      bill_path,
      type: formType,
      created_by: user?.id,
    };

    const { error } = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert([payload]);

    if (error) {
      console.error("Error saving transaction:", error);
      setErrorMessage(`Failed to save transaction: ${error.message}`);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      fetchTransactions();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        projectId: "",
        phaseId: "",
        category: "",
        amount: "",
        paymentMethod: "",
        date: "",
        billFile: null,
        includeGst: false,
        gstAmount: "",
      });
      setSuccessMessage(`${formType === 'income' ? 'Income' : 'Expense'} saved successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    const project =
      phases.find((p) => p.id === transaction.phase_id)?.project_id || "";
    setFormData({
      projectId: project,
      phaseId: transaction.phase_id,
      category: transaction.category,
      amount: transaction.amount.toString(),
      paymentMethod: transaction.payment_method,
      date: transaction.date,
      billFile: null,
      includeGst: (transaction.gst_amount || 0) > 0,
      gstAmount: (transaction.gst_amount || 0).toString(),
    });
    setFormType(transaction.type);
    setEditingId(transaction.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (!error) {
        fetchTransactions();
        if (selectedTransaction?.id === id) {
          setSelectedTransaction(null);
        }
        setSuccessMessage("Transaction deleted successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage("Failed to delete transaction.");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  };

  const openForm = (type: 'expense' | 'income') => {
    setFormType(type);
    setEditingId(null);
    setFormData({
      projectId: "",
      phaseId: "",
      category: "",
      amount: "",
      paymentMethod: "",
      date: "",
      billFile: null,
      includeGst: false,
      gstAmount: "",
    });
    setShowForm(true);
  };

  // Clear date filters
  const clearDateFilters = () => {
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesProject = !selectedProject || t.project_name === selectedProject;
    const matchesSearch =
      !search ||
      t.project_name.toLowerCase().includes(search.toLowerCase()) ||
      t.phase_name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.payment_method.toLowerCase().includes(search.toLowerCase());

    // Date range filtering
    let matchesDateRange = true;
    if (fromDate && toDate) {
      const transactionDate = new Date(t.date);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      matchesDateRange = transactionDate >= from && transactionDate <= to;
    } else if (fromDate) {
      const transactionDate = new Date(t.date);
      const from = new Date(fromDate);
      matchesDateRange = transactionDate >= from;
    } else if (toDate) {
      const transactionDate = new Date(t.date);
      const to = new Date(toDate);
      matchesDateRange = transactionDate <= to;
    }

    return matchesProject && matchesSearch && matchesDateRange;
  });

  const currentTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Calculate totals including GST
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount + (t.gst_amount || 0), 0);

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount + (t.gst_amount || 0), 0);

  // Prepare chart data
  const getChartData = (): ChartData[] => {
    const dataMap = new Map<string, { expense: number; income: number }>();

    filteredTransactions.forEach((t) => {
      const date = format(new Date(t.date), "MMM dd");
      if (!dataMap.has(date)) {
        dataMap.set(date, { expense: 0, income: 0 });
      }
      const current = dataMap.get(date)!;
      const totalAmount = t.amount + (t.gst_amount || 0);
      if (t.type === 'expense') {
        current.expense += totalAmount;
      } else {
        current.income += totalAmount;
      }
    });

    return Array.from(dataMap.entries())
      .map(([date, values]) => ({
        date,
        expense: values.expense,
        income: values.income,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 data points
  };

  const chartData = getChartData();

  // Get the header subtitle based on selected transaction
  const getHeaderSubtitle = () => {
    if (selectedTransaction) {
      const typeLabel = selectedTransaction.type === 'income' ? 'Income' : 'Expense';
      const totalAmount = selectedTransaction.amount + (selectedTransaction.gst_amount || 0);
      return `${typeLabel}: ${selectedTransaction.category} - ₹${totalAmount.toFixed(2)} - ${selectedTransaction.project_name}`;
    }
    return undefined;
  };

  // Handle click outside to close modal
  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowForm(false);
      setShowPaymentLinkForm(false);
      setShowGstModal(false);
      setShowPaymentLinksTable(false);
      setShowDetailsModal(false);
    }
  };

  // Get payment status icon and color
  const getPaymentStatusDisplay = (status: string) => {
    switch (status) {
      case 'paid':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', text: 'Paid' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', text: 'Failed' };
      default:
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', text: 'Pending' };
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Layout title="Financial Transactions" subtitle={getHeaderSubtitle()}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Success/Error Message Notifications */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg shadow">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg shadow">
              {errorMessage}
            </div>
          )}

          {/* Charts Section */}
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Income vs Expenses Trend</h3>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">Income: ₹{totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">Expenses: ₹{totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Net: ₹{(totalIncome - totalExpenses).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `₹${value.toFixed(2)}`,
                      name === 'expense' ? 'Expenses' : 'Income'
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name=""
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Header Section with New Buttons */}
          <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
            <div className="flex gap-3">
              <button
                onClick={downloadCSVTemplate}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileDown className="mr-2" size={18} /> Download Template
              </button>
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="flex items-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Upload className="mr-2" size={18} /> Bulk Upload
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="mr-2" size={18} /> Export CSV
              </button>
              <button
                onClick={() => setShowPaymentLinkForm(true)}
                className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <LinkIcon className="mr-2" size={18} /> Payment Link
              </button>
              <button
                onClick={() => setShowPaymentLinksTable(true)}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="mr-2" size={18} /> View Links ({paymentLinks.length})
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => openForm('income')}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="mr-2" size={18} /> Add Income
              </button>
              <button
                onClick={() => openForm('expense')}
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="mr-2" size={18} /> Add Expense
              </button>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex items-center mb-4 gap-4 flex-wrap">
            <div className="flex-1 flex items-center gap-2 min-w-64">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Date Range Filters */}
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <span className="text-sm text-gray-600">From:</span>
              <input
                type="date"
                className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <span className="text-sm text-gray-600">To:</span>
              <input
                type="date"
                className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {(fromDate || toDate) && (
                <button
                  onClick={clearDateFilters}
                  className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                  title="Clear date filters"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Table Container - Scrollable */}
          <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-xl text-gray-600">Loading...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Type</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Project</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Phase</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Category</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Amount</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">GST</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Total</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Payment Method</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Bill</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Date</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map((t) => {
                    const totalAmount = t.amount + (t.gst_amount || 0);
                    const hasGst = (t.gst_amount || 0) > 0;
                    return (
                      <tr
                        key={t.id}
                        className={`cursor-pointer transition-all border-b hover:bg-gray-50 ${
                          selectedTransaction?.id === t.id
                            ? "bg-blue-50 border-l-4 border-l-blue-500"
                            : ""
                        } ${t.type === 'expense' ? 'bg-red-50' : 'bg-green-50'}`}
                        onClick={() => setSelectedTransaction(t)}
                      >
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            t.type === 'income'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {t.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-900">{t.project_name}</td>
                        <td className="p-3 text-gray-900">{t.phase_name}</td>
                        <td className="p-3 text-gray-900">{t.category}</td>
                        <td className={`p-3 font-medium ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                        </td>
                        <td className={`p-3 ${hasGst ? 'text-blue-600' : 'text-gray-500'}`}>
                          {hasGst ? (
                            <span className="bg-blue-50 px-2 py-1 rounded text-sm font-medium">
                              ₹{(t.gst_amount || 0).toFixed(2)}
                            </span>
                          ) : (
                            'No GST'
                          )}
                        </td>
                        <td className={`p-3 font-bold ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}₹{totalAmount.toFixed(2)}
                        </td>
                        <td className="p-3 text-gray-900">{t.payment_method}</td>
                        <td className="p-3">
                          {t.bill_path ? (
                            <a
                              href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/bills/${t.bill_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              View Bill
                            </a>
                          ) : (
                            <span className="text-gray-500">No Bill</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-900">
                          {format(new Date(t.date), "dd/MM/yyyy")}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setDetailsTransaction(t);
                                setShowDetailsModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEdit(t);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(t.id);
                              }}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {currentTransactions.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-gray-500">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-center items-center gap-4 py-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </Layout>

      {/* Transaction Details Modal */}
      {showDetailsModal && detailsTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={handleClickOutside}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  detailsTransaction.type === 'income'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {detailsTransaction.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {detailsTransaction.type === 'income' ? 'Income' : 'Expense'} Details
                  </h2>
                  <p className="text-sm text-gray-500">Transaction ID: {detailsTransaction.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailsTransaction(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Category Badge */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <p className="text-lg font-semibold text-gray-900">{detailsTransaction.category}</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  detailsTransaction.type === 'income'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {detailsTransaction.type === 'income' ? 'Income' : 'Expense'}
                </div>
              </div>

              {/* Project and Phase Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Project</p>
                  <p className="text-base font-semibold text-gray-900">{detailsTransaction.project_name}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Phase</p>
                  <p className="text-base font-semibold text-gray-900">{detailsTransaction.phase_name}</p>
                </div>
              </div>

              {/* Amount Details */}
              <div className="border-2 border-gray-200 rounded-lg p-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Breakdown</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Base Amount:</span>
                  <span className={`text-xl font-bold ${
                    detailsTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {detailsTransaction.type === 'income' ? '+' : '-'}₹{detailsTransaction.amount.toFixed(2)}
                  </span>
                </div>
                {(detailsTransaction.gst_amount || 0) > 0 && (
                  <>
                    <div className="flex justify-between items-center text-blue-600">
                      <span className="text-gray-600">GST Amount:</span>
                      <span className="text-lg font-semibold">+₹{(detailsTransaction.gst_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-semibold">Total Amount:</span>
                        <span className={`text-2xl font-bold ${
                          detailsTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {detailsTransaction.type === 'income' ? '+' : '-'}₹{(detailsTransaction.amount + (detailsTransaction.gst_amount || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Payment Method and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-xs">
                        {detailsTransaction.payment_method.charAt(0)}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-gray-900">{detailsTransaction.payment_method}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-500" />
                    <p className="text-base font-semibold text-gray-900">
                      {format(new Date(detailsTransaction.date), "dd MMMM yyyy")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill/Receipt */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  {detailsTransaction.type === 'income' ? 'Receipt' : 'Bill'} Attachment
                </p>
                {detailsTransaction.bill_path ? (
                  <a
                    href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/bills/${detailsTransaction.bill_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText size={18} />
                    View {detailsTransaction.type === 'income' ? 'Receipt' : 'Bill'}
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
                    <FileText size={18} />
                    <span>No {detailsTransaction.type === 'income' ? 'receipt' : 'bill'} attached</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setDetailsTransaction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEdit(detailsTransaction);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit2 size={18} />
                  Edit Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={handleClickOutside}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId
                  ? `Edit ${formType === 'income' ? 'Income' : 'Expense'}`
                  : `Add ${formType === 'income' ? 'Income' : 'Expense'}`
                }
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Select Project</label>
                  <select
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.projectId}
                    onChange={(e) => handleChange("projectId", e.target.value)}
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Select Phase</label>
                  <select
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.phaseId}
                    onChange={(e) => handleChange("phaseId", e.target.value)}
                    required
                  >
                    <option value="">Select Phase</option>
                    {filteredPhases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {(formType === 'income' ? INCOME_CATEGORY_OPTIONS : EXPENSE_CATEGORY_OPTIONS).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-gray-700 mb-2">GST</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.includeGst}
                        onChange={(e) => {
                          handleChange("includeGst", e.target.checked);
                          if (!e.target.checked) handleChange("gstAmount", "");
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-700">Include GST in Bill</span>
                    </div>
                    {formData.includeGst && (
                      <button
                        type="button"
                        onClick={() => setShowGstModal(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Calculator className="mr-2" size={16} /> Set GST Amount
                      </button>
                    )}
                  </div>
                  {formData.includeGst && formData.gstAmount && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        GST Amount: ₹{parseFloat(formData.gstAmount).toFixed(2)}
                      </p>
                      <p className="text-sm text-blue-800 font-semibold">
                        Total: ₹{(parseFloat(formData.amount || "0") + parseFloat(formData.gstAmount)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      handleChange("paymentMethod", e.target.value)
                    }
                    required
                  >
                    <option value="">Select Payment Method</option>
                    {PAYMENT_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">
                    Attach {formType === 'income' ? 'Receipt' : 'Bill'}
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={(e) =>
                      handleChange(
                        "billFile",
                        e.target.files ? e.target.files[0] : null
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    formType === 'income'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {editingId ? "Update" : `Save ${formType === 'income' ? 'Income' : 'Expense'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GST Modal */}
      {showGstModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000]" onClick={handleClickOutside}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Enter GST Amount</h3>
              </div>
              <button
                onClick={() => setShowGstModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  GST Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter GST amount"
                  className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={gstAmount}
                  onChange={(e) => setGstAmount(e.target.value)}
                  autoFocus
                />
              </div>
              {formData.amount && gstAmount && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Base Amount: ₹{parseFloat(formData.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-blue-800">
                    GST Amount: ₹{parseFloat(gstAmount).toFixed(2)}
                  </p>
                  <p className="text-sm text-blue-800 font-semibold border-t border-blue-200 pt-2 mt-2">
                    Total Amount: ₹{(parseFloat(formData.amount) + parseFloat(gstAmount)).toFixed(2)}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowGstModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGstConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Link Creation Modal */}
      {showPaymentLinkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={handleClickOutside}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Create Payment Link</h2>
              </div>
              <button
                onClick={() => setShowPaymentLinkForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Business Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      placeholder="Enter your business name"
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={paymentLinkData.businessName}
                      onChange={(e) => handlePaymentLinkChange("businessName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="22AAAAA0000A1Z5"
                      className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={paymentLinkData.gstNumber}
                      onChange={(e) => handlePaymentLinkChange("gstNumber", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Product/Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter product or service name"
                  className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={paymentLinkData.productName}
                  onChange={(e) => handlePaymentLinkChange("productName", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Unit Price (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={paymentLinkData.amount}
                    onChange={(e) => handlePaymentLinkChange("amount", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={paymentLinkData.quantity}
                    onChange={(e) => handlePaymentLinkChange("quantity", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">GST Rate</label>
                  <select
                    className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={paymentLinkData.gstRate}
                    onChange={(e) => handlePaymentLinkChange("gstRate", e.target.value)}
                  >
                    <option value="18">18% - Most Services & Products</option>
                    <option value="5">5% - Basic household items</option>
                    <option value="12">12% - Construction materials</option>
                    <option value="28">28% - Luxury items</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">GST Configuration</h3>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={paymentLinkData.includeGst}
                    onChange={(e) => handlePaymentLinkChange("includeGst", e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Include GST in payment (As per Indian Tax Laws)</span>
                </div>
                {paymentLinkData.includeGst && (
                  <div className="mt-2 p-2 bg-white rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-1">GST Breakdown (Selected Rate: {paymentLinkData.gstRate}%)</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>For Intra-State Sales:</div><div>CGST: {parseFloat(paymentLinkData.gstRate) / 2}% + SGST: {parseFloat(paymentLinkData.gstRate) / 2}%</div>
                      <div>For Inter-State Sales:</div><div>IGST: {paymentLinkData.gstRate}%</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Add a description for your product or service..."
                  rows={3}
                  className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  value={paymentLinkData.description}
                  onChange={(e) => handlePaymentLinkChange("description", e.target.value)}
                />
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-3">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product/Service:</span>
                    <span className="text-gray-900">
                      {paymentLinkData.productName || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="text-gray-900">
                      ₹{paymentLinkData.amount || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="text-gray-900">{paymentLinkData.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900">₹{(parseFloat(paymentLinkData.amount || '0') * parseInt(paymentLinkData.quantity || '1')).toFixed(2)}</span>
                  </div>
                  {paymentLinkData.includeGst && (
                    <>
                      <div className="flex justify-between text-blue-600">
                        <span className="text-gray-600">CGST ({parseFloat(paymentLinkData.gstRate) / 2}%):</span>
                        <span className="text-blue-600">₹{((parseFloat(paymentLinkData.amount || '0') * parseInt(paymentLinkData.quantity || '1')) * (parseFloat(paymentLinkData.gstRate) / 200)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <span className="text-gray-600">SGST ({parseFloat(paymentLinkData.gstRate) / 2}%):</span>
                        <span className="text-blue-600">₹{((parseFloat(paymentLinkData.amount || '0') * parseInt(paymentLinkData.quantity || '1')) * (parseFloat(paymentLinkData.gstRate) / 200)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-700">Total GST:</span>
                        <span className="text-blue-600">₹{((parseFloat(paymentLinkData.amount || '0') * parseInt(paymentLinkData.quantity || '1')) * (parseFloat(paymentLinkData.gstRate) / 100)).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-700">Total Amount:</span>
                    <span className="text-purple-600">₹{((parseFloat(paymentLinkData.amount || '0') * parseInt(paymentLinkData.quantity || '1')) * (paymentLinkData.includeGst ? (1 + parseFloat(paymentLinkData.gstRate) / 100) : 1)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowPaymentLinkForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateInvoice}
                  disabled={!paymentLinkData.productName || !paymentLinkData.amount}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileText className="mr-2 inline" size={16} />
                  Generate Invoice
                </button>
                <button
                  onClick={createSimplePaymentLink}
                  disabled={!paymentLinkData.productName || !paymentLinkData.amount || creatingPaymentLink}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingPaymentLink ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <QrCode className="mr-2 inline" size={16} />
                      Create Payment Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Links Table Modal */}
      {showPaymentLinksTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={handleClickOutside}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Payment Links ({paymentLinks.length})</h2>
              </div>
              <button
                onClick={() => setShowPaymentLinksTable(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {paymentLinks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Product/Service</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Business Name</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Amount</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">GST Number</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Payment Status</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Created</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentLinks.map((link) => {
                      const statusDisplay = getPaymentStatusDisplay(link.payment_status);
                      const StatusIcon = statusDisplay.icon;
                      const totalAmount = link.amount * link.quantity * (link.gst_rate ? (1 + link.gst_rate / 100) : 1);

                      return (
                        <tr key={link.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-gray-900">{link.product_name}</div>
                              {link.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">{link.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-gray-900">{link.business_name || 'Not specified'}</td>
                          <td className="p-3">
                            <div className="text-gray-900 font-medium">₹{totalAmount.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">
                              {link.quantity} × ₹{link.amount.toFixed(2)}
                              {link.gst_rate > 0 && ` + ${link.gst_rate}% GST`}
                            </div>
                          </td>
                          <td className="p-3 text-gray-900">{link.gst_number || 'Not provided'}</td>
                          <td className="p-3">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.bg} ${statusDisplay.color}`}>
                              <StatusIcon size={16} />
                              {statusDisplay.text}
                            </div>
                          </td>
                          <td className="p-3 text-gray-900">
                            {format(new Date(link.created_at), "dd/MM/yyyy")}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <a
                                href={link.razorpay_link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                                title="Open Payment Link"
                              >
                                <LinkIcon size={16} />
                              </a>
                              {link.razorpay_qr_code && (
                                <a
                                  href={link.razorpay_qr_code}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                                  title="View QR Code"
                                >
                                  <QrCode size={16} />
                                </a>
                              )}
                              {link.payment_status === 'pending' && (
                                <button
                                  onClick={() => testPayment(link.razorpay_link_id)}
                                  className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                                  title="Test Payment (Mark as Paid)"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payment links</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new payment link.</p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setShowPaymentLinksTable(false);
                      setShowPaymentLinkForm(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="mr-2" size={16} />
                    Create Payment Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClickOutside}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Expenses</h2>
                <p className="text-sm text-gray-600 mt-1">Upload a CSV file to add multiple expenses at once</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setCsvFile(null);
                  setValidationErrors([]);
                  setValidRowCount(0);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Download the CSV template using the "Download Template" button</li>
                      <li>Fill in your expense data following the example format</li>
                      <li>Ensure project names and phase names match exactly with existing data</li>
                      <li>Use the format DD-MM-YYYY for dates (e.g., 07-10-2025)</li>
                      <li>Upload the completed CSV file</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVFileSelect}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                  />
                  {csvFile && (
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setValidationErrors([]);
                        setValidRowCount(0);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove file"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                {csvFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Validation Summary */}
              {csvFile && (
                <div className="mb-6">
                  <div className={`rounded-lg p-4 ${validationErrors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start">
                      {validationErrors.length === 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${validationErrors.length === 0 ? 'text-green-800' : 'text-red-800'}`}>
                          {validationErrors.length === 0
                            ? `Validation Passed! ${validRowCount} rows ready to upload.`
                            : `Validation Failed: ${validationErrors.length} error(s) found`
                          }
                        </p>
                        {validRowCount > 0 && validationErrors.length > 0 && (
                          <p className="text-sm text-gray-700 mt-1">
                            {validRowCount} valid row(s) out of {validRowCount + validationErrors.length} total rows
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Validation Errors:</h3>
                  <div className="bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {validationErrors.slice(0, 50).map((error, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{error.row}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{error.field}</td>
                            <td className="px-4 py-2 text-sm text-red-600">{error.message}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                              {error.value !== undefined ? String(error.value) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationErrors.length > 50 && (
                      <div className="p-3 text-center text-sm text-gray-600 bg-gray-50">
                        ... and {validationErrors.length - 50} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Valid Columns Reference */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">CSV Column Reference:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Required Columns:</p>
                    <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                      <li>project_name</li>
                      <li>phase_name</li>
                      <li>category</li>
                      <li>amount</li>
                      <li>date (DD-MM-YYYY)</li>
                      <li>payment_method</li>
                      <li>type (expense/income)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Optional Columns:</p>
                    <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                      <li>gst_amount</li>
                      <li>source</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setCsvFile(null);
                  setValidationErrors([]);
                  setValidRowCount(0);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={!csvFile || validationErrors.length > 0 || uploadingFile}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingFile ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload {validRowCount > 0 ? `${validRowCount} Rows` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
