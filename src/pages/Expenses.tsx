import React, { useState, useEffect } from "react";
import { Plus, Search, X, Trash, CreditCard as Edit2, TrendingUp, TrendingDown, Calendar, Upload, Download, Link as LinkIcon, FileText, Calculator } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import Papa from "papaparse";
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
  product_name: string;
  amount: number;
  quantity: number;
  description: string;
  razorpay_link_id: string;
  razorpay_link_url: string;
  status: 'active' | 'inactive';
  created_at: string;
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

// Razorpay configuration - Add your keys here
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showPaymentLinkForm, setShowPaymentLinkForm] = useState(false);
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
    withGst: false,
    gstAmount: "",
  });
  const [paymentLinkData, setPaymentLinkData] = useState({
    productName: "",
    amount: "",
    quantity: "1",
    description: "",
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  // CSV Export functionality
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
      'Date': format(new Date(t.date), "dd-MM-yyyy"),
      'Bill': t.bill_path ? 'Yes' : 'No'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk upload functionality
  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBulkFile(file);
    }
  };

  const processBulkUpload = () => {
    if (!bulkFile) return;

    Papa.parse(bulkFile, {
      header: true,
      complete: async (results) => {
        const validRows = results.data.filter((row: any) => 
          row.project_name && row.phase_name && row.category && row.amount
        );

        for (const row of validRows) {
          try {
            // Find project and phase IDs
            const project = projects.find(p => p.name === row.project_name);
            const phase = phases.find(p => p.name === row.phase_name && p.project_id === project?.id);

            if (project && phase) {
              const payload = {
                project_id: project.id,
                phase_id: phase.id,
                category: row.category,
                amount: parseFloat(row.amount),
                gst_amount: row.gst_amount ? parseFloat(row.gst_amount) : null,
                date: row.date || format(new Date(), 'yyyy-MM-dd'),
                payment_method: row.payment_method || 'Cash',
                type: row.type || 'expense',
                created_by: user?.id,
              };

              await supabase.from("expenses").insert([payload]);
            }
          } catch (error) {
            console.error('Error processing row:', error);
          }
        }

        fetchTransactions();
        setShowBulkUpload(false);
        setBulkFile(null);
        setSuccessMessage(`Successfully uploaded ${validRows.length} transactions!`);
        setTimeout(() => setSuccessMessage(null), 5000);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setSuccessMessage('Error parsing CSV file. Please check the format.');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    });
  };

  // Payment link functionality
  const createPaymentLink = async () => {
    try {
      const response = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(paymentLinkData.amount) * 100, // Convert to paise
          currency: 'INR',
          description: paymentLinkData.description,
          customer: {
            name: user?.email?.split('@')[0] || 'Customer',
            email: user?.email,
          },
          notify: {
            sms: true,
            email: true,
          },
          reminder_enable: true,
          notes: {
            product_name: paymentLinkData.productName,
            quantity: paymentLinkData.quantity,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Save to database
        const { error } = await supabase.from('payment_links').insert([{
          product_name: paymentLinkData.productName,
          amount: parseFloat(paymentLinkData.amount),
          quantity: parseInt(paymentLinkData.quantity),
          description: paymentLinkData.description,
          razorpay_link_id: result.data.id,
          razorpay_link_url: result.data.short_url,
          status: 'active',
          created_by: user?.id,
        }]);

        if (!error) {
          fetchPaymentLinks();
          setShowPaymentLinkForm(false);
          setPaymentLinkData({
            productName: "",
            amount: "",
            quantity: "1",
            description: "",
          });
          setSuccessMessage('Payment link created successfully!');
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      } else {
        setSuccessMessage('Failed to create payment link: ' + result.error);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      setSuccessMessage('Error creating payment link. Please try again.');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const filteredPhases = phases.filter(
    (p) => !formData.projectId || p.project_id === formData.projectId
  );

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentLinkChange = (field: keyof typeof paymentLinkData, value: string) => {
    setPaymentLinkData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle GST button click
  const handleGstClick = (withGst: boolean) => {
    if (withGst) {
      setShowGstModal(true);
    } else {
      setFormData(prev => ({ ...prev, withGst: false, gstAmount: "" }));
    }
  };

  // Handle GST modal confirm
  const handleGstConfirm = () => {
    if (!gstAmount || parseFloat(gstAmount) < 0) {
      setSuccessMessage("Please enter a valid GST amount");
      setTimeout(() => setSuccessMessage(null), 5000);
      return;
    }
    setFormData(prev => ({ 
      ...prev, 
      withGst: true, 
      gstAmount: gstAmount 
    }));
    setShowGstModal(false);
    setGstAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { projectId, phaseId, category, amount, paymentMethod, date, billFile, withGst, gstAmount } = formData;

    if (!phaseId || !projectId || !category || !paymentMethod) {
      setSuccessMessage("Please fill all required fields.");
      setTimeout(() => setSuccessMessage(null), 5000);
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
        setSuccessMessage("Failed to upload bill.");
        setTimeout(() => setSuccessMessage(null), 5000);
        return;
      }
      bill_path = fileName;
    }

    const payload = {
      project_id: projectId,
      phase_id: phaseId,
      category,
      amount: parseFloat(amount),
      gst_amount: withGst && gstAmount ? parseFloat(gstAmount) : null,
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
      setSuccessMessage(`Failed to save transaction: ${error.message}`);
      setTimeout(() => setSuccessMessage(null), 5000);
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
        withGst: false,
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
      withGst: (transaction.gst_amount || 0) > 0,
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
        setSuccessMessage("Failed to delete transaction.");
        setTimeout(() => setSuccessMessage(null), 5000);
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
      withGst: false,
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

  return (
    <div className="h-screen flex flex-col">
      <Layout title="Financial Transactions" subtitle={getHeaderSubtitle()}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Success Message Notification */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg shadow">
              {successMessage}
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
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="mr-2" size={18} /> Bulk Upload
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="mr-2" size={18} /> Export
              </button>
              <button
                onClick={() => setShowPaymentLinkForm(true)}
                className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <LinkIcon className="mr-2" size={18} /> Payment Link
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
                        <td className={`p-3 ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(t.gst_amount || 0) > 0 ? `₹${(t.gst_amount || 0).toFixed(2)}` : 'No GST'}
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
                          {format(new Date(t.date), "dd-MM-yyyy")}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
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

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
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
              
              {/* GST Section */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">GST</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleGstClick(false)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      !formData.withGst 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Without GST
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGstClick(true)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      formData.withGst 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    With GST
                  </button>
                </div>
                {formData.withGst && formData.gstAmount && (
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
              <div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000]">
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

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Bulk Upload Transactions</h2>
              <button 
                onClick={() => setShowBulkUpload(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• project_name (required)</li>
                  <li>• phase_name (required)</li>
                  <li>• category (required)</li>
                  <li>• amount (required)</li>
                  <li>• gst_amount (optional)</li>
                  <li>• type (expense/income, optional - defaults to expense)</li>
                  <li>• payment_method (optional - defaults to Cash)</li>
                  <li>• date (optional - defaults to today)</li>
                </ul>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkUpload(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processBulkUpload}
                  disabled={!bulkFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {showPaymentLinkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
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
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter product name"
                    className="border border-gray-300 p-2 pl-10 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={paymentLinkData.productName}
                    onChange={(e) => handlePaymentLinkChange("productName", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="border border-gray-300 p-2 pl-8 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={paymentLinkData.amount}
                      onChange={(e) => handlePaymentLinkChange("amount", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Quantity</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">#</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      className="border border-gray-300 p-2 pl-8 rounded-lg w-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={paymentLinkData.quantity}
                      onChange={(e) => handlePaymentLinkChange("quantity", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Add a description for your product..."
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
                    <span className="text-gray-600">Product:</span>
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
                  <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-purple-600">
                      ₹{(parseFloat(paymentLinkData.amount || '0') * parseInt(paymentLinkData.quantity || '1')).toFixed(2)}
                    </span>
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
                  onClick={createPaymentLink}
                  disabled={!paymentLinkData.productName || !paymentLinkData.amount}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Links List */}
      {paymentLinks.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <h4 className="font-medium text-gray-900 mb-2">Recent Payment Links</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {paymentLinks.slice(0, 3).map((link) => (
              <div key={link.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 truncate">{link.product_name}</span>
                <a
                  href={link.razorpay_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 underline"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}