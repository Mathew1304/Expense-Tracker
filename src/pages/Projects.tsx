import React, { useState, useEffect } from "react";
import { Plus, Search, CreditCard as Edit, X, Eye, Download, File, User, Share2, Copy, Lock, Globe } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import jsPDF from "jspdf";
import "jspdf-autotable";

export function Projects() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [viewingProject, setViewingProject] = useState<any | null>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [income, setIncome] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [phasePhotos, setPhasePhotos] = useState<any[]>([]);

  // Share modal states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingProject, setSharingProject] = useState<any | null>(null);
  const [shareType, setShareType] = useState<'public' | 'private' | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "pending",
    location: "",
    start_date: "",
    end_date: "",
  });

  const [filterStatus, setFilterStatus] = useState("All");

  // ✅ Fetch current admin ID
  useEffect(() => {
    if (user) setProfileId(user.id);
  }, [user]);

  // ✅ Fetch projects created by this admin only
  const fetchProjects = async () => {
    if (!profileId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("created_by", profileId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch projects error:", error.message);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profileId) fetchProjects();
  }, [profileId]);

  // ✅ Handle Save Project
  const handleSaveProject = async () => {
    if (!profileId) return;

    try {
      if (editingProject) {
        // Update existing project
        const { error } = await supabase
          .from("projects")
          .update(newProject)
          .eq("id", editingProject.id);

        if (error) throw error;
      } else {
        // Create new project
        const { error } = await supabase
          .from("projects")
          .insert([{ ...newProject, created_by: profileId }]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingProject(null);
      setNewProject({
        name: "",
        description: "",
        status: "pending",
        location: "",
        start_date: "",
        end_date: "",
      });
      fetchProjects();
    } catch (error: any) {
      console.error("Save project error:", error.message);
      alert("Error saving project: " + error.message);
    }
  };

  // ✅ Fetch Phases, Expenses, Materials, Team Members, and Phase Photos for a project
  const fetchProjectDetails = async (projectId: string) => {
    console.log("Fetching details for project:", projectId);

    try {
      // Fetch phases
      const { data: phaseData, error: phaseError } = await supabase
        .from("phases")
        .select("*")
        .eq("project_id", projectId);

      if (phaseError) {
        console.error("Fetch phases error:", phaseError.message);
      }

      // Fetch expenses and income separately
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select(`
          *,
          phases!inner(name)
        `)
        .eq("project_id", projectId)
        .eq("type", "expense");

      if (expenseError) {
        console.error("Fetch expenses error:", expenseError.message);
      }

      const { data: incomeData, error: incomeError } = await supabase
        .from("expenses")
        .select(`
          *,
          phases!inner(name)
        `)
        .eq("project_id", projectId)
        .eq("type", "income");

      if (incomeError) {
        console.error("Fetch income error:", incomeError.message);
      }

      // Fetch materials
      const { data: materialData, error: materialError } = await supabase
        .from("materials")
        .select("id, name, unit_cost, qty_required, status, updated_at")
        .eq("project_id", projectId);

      if (materialError) {
        console.error("Fetch materials error:", materialError.message);
      }

      // Fetch team members
      const { data: teamData, error: teamError } = await supabase
        .from("users")
        .select("id, name, email, role_id, status, active")
        .eq("project_id", projectId)
        .eq("created_by", profileId);

      if (teamError) {
        console.error("Fetch team members error:", teamError.message);
      }

      // Fetch phase photos
      const { data: photoData, error: photoError } = await supabase
        .from("phase_photos")
        .select(`
          *,
          phases!inner(name)
        `)
        .eq("project_id", projectId);

      if (photoError) {
        console.error("Fetch phase photos error:", photoError.message);
      }

      // Update state with fetched data
      setPhases(phaseData || []);
      setExpenses(expenseData || []);
      setIncome(incomeData || []);
      setMaterials(materialData || []);
      setTeamMembers(teamData || []);
      setPhasePhotos(photoData || []);

      console.log("Fetched data:", {
        phases: phaseData?.length || 0,
        expenses: expenseData?.length || 0,
        income: incomeData?.length || 0,
        materials: materialData?.length || 0,
        teamMembers: teamData?.length || 0,
        phasePhotos: photoData?.length || 0
      });

      return {
        phases: phaseData || [],
        expenses: expenseData || [],
        income: incomeData || [],
        materials: materialData || [],
        teamMembers: teamData || [],
        phasePhotos: photoData || []
      };
    } catch (error) {
      console.error("Error fetching project details:", error);
      return {
        phases: [],
        expenses: [],
        income: [],
        materials: [],
        teamMembers: [],
        phasePhotos: []
      };
    }
  };

  const handleViewProject = async (project: any) => {
    setViewingProject(project);
    await fetchProjectDetails(project.id);
  };

  // ✅ Helper function to convert image URL to base64
  const getImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return null;
    }
  };

  // ✅ PDF Download with Phase Photos and separate expense/income sections
  const handleDownloadReport = async (project: any) => {
    console.log("Starting PDF generation for project:", project.name);
    
    // Fetch fresh data for PDF generation
    const projectData = await fetchProjectDetails(project.id);
    
    // Wait a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 500));

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // --- HEADER FUNCTION ---
    const addHeader = (title: string) => {
      doc.setFillColor(41, 128, 185); // Blue background
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT REPORT', margin, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin - 60, 20);
      
      // Section title
      doc.setTextColor(41, 128, 185);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, 45);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
    };

    // --- FOOTER FUNCTION ---
    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 10);
      doc.text(`${project.name} - Project Report`, margin, pageHeight - 10);
    };

    let currentPageNum = 1;

    // --- PAGE 1: PROJECT OVERVIEW ---
    addHeader('PROJECT OVERVIEW');
    
    let yPos = 80;
    
    // Project name centered
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 73, 94);
    const projectNameWidth = doc.getTextWidth(project.name);
    doc.text(project.name, (pageWidth - projectNameWidth) / 2, yPos);
    yPos += 25;
    
    // Create centered info boxes
    const infoBoxes = [
      { label: 'Status', value: project.status, color: project.status === 'completed' ? [46, 204, 113] : project.status === 'active' ? [241, 196, 15] : [231, 76, 60] },
      { label: 'Location', value: project.location || 'Not specified' },
      { label: 'Start Date', value: project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set' },
      { label: 'End Date', value: project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set' },
    ];
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const boxWidth = contentWidth * 0.8;
    const boxStartX = (pageWidth - boxWidth) / 2;
    
    infoBoxes.forEach((box, index) => {
      const boxY = yPos + (index * 25);
      
      // Box background
      if (box.color) {
        doc.setFillColor(box.color[0], box.color[1], box.color[2]);
        doc.rect(boxStartX, boxY - 5, boxWidth, 20, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setFillColor(236, 240, 241);
        doc.rect(boxStartX, boxY - 5, boxWidth, 20, 'F');
        doc.setTextColor(52, 73, 94);
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${box.label}:`, boxStartX + 10, boxY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(box.value, boxStartX + 60, boxY + 5);
    });
    
    yPos += 120;
    
    // Description section centered
    doc.setTextColor(52, 73, 94);
    doc.setFont('helvetica', 'bold');
    const descLabelWidth = doc.getTextWidth('DESCRIPTION:');
    doc.text('DESCRIPTION:', (pageWidth - descLabelWidth) / 2, yPos);
    yPos += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const description = project.description || 'No description provided';
    const splitDescription = doc.splitTextToSize(description, boxWidth);
    
    // Center each line of description
    splitDescription.forEach((line: string, index: number) => {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, (pageWidth - lineWidth) / 2, yPos + (index * 6));
    });
    
    addFooter(currentPageNum++);

    // --- PAGE 2: PHASES ---
    doc.addPage();
    addHeader('PROJECT PHASES');
    
    if (projectData.phases.length > 0) {
      const phaseRows = projectData.phases.map((p) => {
        const estimatedCost = Number(p.estimated_cost || 0);
        return [
          p.name || 'Unnamed Phase',
          p.status || 'Not Set',
          p.start_date ? new Date(p.start_date).toLocaleDateString() : 'Not Set',
          p.end_date ? new Date(p.end_date).toLocaleDateString() : 'Not Set',
          estimatedCost > 0 ? `Rs ${estimatedCost.toLocaleString()}` : 'Not Set',
          p.contractor_name || 'Not Assigned'
        ];
      });
      
      (doc as any).autoTable({
        head: [['Phase Name', 'Status', 'Start Date', 'End Date', 'Estimated Cost', 'Contractor']],
        body: phaseRows,
        startY: 55,
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 35 }
        }
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('No phases found for this project.', margin, 70);
    }
    
    addFooter(currentPageNum++);

    // --- PAGE 3: PHASE PHOTOS ---
    if (projectData.phasePhotos.length > 0) {
      doc.addPage();
      addHeader('PHASE PHOTOS');
      
      let currentY = 60;
      let photosPerPage = 0;
      const maxPhotosPerPage = 4;
      const photoWidth = 70;
      const photoHeight = 50;
      const photoSpacing = 10;
      
      // Group photos by phase
      const photosByPhase = projectData.phasePhotos.reduce((acc, photo) => {
        const phaseName = photo.phases?.name || 'Unknown Phase';
        if (!acc[phaseName]) acc[phaseName] = [];
        acc[phaseName].push(photo);
        return acc;
      }, {} as { [key: string]: any[] });

      for (const [phaseName, photos] of Object.entries(photosByPhase)) {
        // Check if we need a new page
        if (currentY > pageHeight - 100) {
          doc.addPage();
          addHeader('PHASE PHOTOS (CONTINUED)');
          currentY = 60;
          photosPerPage = 0;
        }

        // Phase name header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text(`Phase: ${phaseName}`, margin, currentY);
        currentY += 15;

        // Display photos in a grid
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          
          // Check if we need a new page
          if (photosPerPage >= maxPhotosPerPage) {
            doc.addPage();
            addHeader('PHASE PHOTOS (CONTINUED)');
            currentY = 60;
            photosPerPage = 0;
            
            // Repeat phase name on new page
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(52, 73, 94);
            doc.text(`Phase: ${phaseName} (continued)`, margin, currentY);
            currentY += 15;
          }

          const col = photosPerPage % 2;
          const row = Math.floor(photosPerPage / 2);
          
          const x = margin + col * (photoWidth + photoSpacing);
          const y = currentY + row * (photoHeight + photoSpacing + 15);

          try {
            // Convert image to base64 and add to PDF
            const base64Image = await getImageAsBase64(photo.photo_url);
            if (base64Image) {
              doc.addImage(base64Image, 'JPEG', x, y, photoWidth, photoHeight);
              
              // Add photo caption
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(128, 128, 128);
              const caption = `Uploaded: ${photo.created_at ? new Date(photo.created_at).toLocaleDateString() : 'Unknown'}`;
              doc.text(caption, x, y + photoHeight + 8);
            } else {
              // If image fails to load, show placeholder
              doc.setFillColor(240, 240, 240);
              doc.rect(x, y, photoWidth, photoHeight, 'F');
              doc.setTextColor(128, 128, 128);
              doc.setFontSize(10);
              doc.text('Image not available', x + 10, y + photoHeight/2);
            }
          } catch (error) {
            console.error('Error adding image to PDF:', error);
            // Show placeholder for failed images
            doc.setFillColor(240, 240, 240);
            doc.rect(x, y, photoWidth, photoHeight, 'F');
            doc.setTextColor(128, 128, 128);
            doc.setFontSize(10);
            doc.text('Image not available', x + 10, y + photoHeight/2);
          }

          photosPerPage++;
        }

        // Update currentY for next phase
        const rows = Math.ceil(photos.length / 2);
        currentY += rows * (photoHeight + photoSpacing + 15) + 20;
      }
      
      addFooter(currentPageNum++);
    }

    // --- PAGE 4: EXPENSES ---
    doc.addPage();
    addHeader('PROJECT EXPENSES');
    
    if (projectData.expenses.length > 0) {
      const expenseRows = projectData.expenses.map((e) => {
        const amount = Number(e.amount || 0);
        const gstAmount = Number(e.gst_amount || 0);
        const totalAmount = amount + gstAmount;
        
        return [
          e.phases?.name || 'No Phase',
          e.category || 'Uncategorized',
          `Rs ${amount.toLocaleString()}`,
          gstAmount > 0 ? `Rs ${gstAmount.toLocaleString()}` : 'No GST',
          `Rs ${totalAmount.toLocaleString()}`,
          e.date ? new Date(e.date).toLocaleDateString() : 'No Date',
          e.payment_method || 'Not Specified'
        ];
      });
      
      const totalExpenses = projectData.expenses.reduce((sum, e) => {
        const amount = Number(e.amount || 0);
        const gstAmount = Number(e.gst_amount || 0);
        return sum + amount + gstAmount;
      }, 0);
      
      (doc as any).autoTable({
        head: [['Phase', 'Category', 'Amount', 'GST', 'Total', 'Date', 'Payment Method']],
        body: expenseRows,
        startY: 55,
        theme: 'striped',
        headStyles: {
          fillColor: [231, 76, 60],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 22, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' }
        }
      });
      
      // Add total expenses box
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(231, 76, 60);
      doc.rect(pageWidth - margin - 100, finalY, 100, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Total Expenses: Rs ${totalExpenses.toLocaleString()}`, pageWidth - margin - 95, finalY + 10);
    } else {
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('No expenses recorded for this project.', margin, 70);
    }
    
    addFooter(currentPageNum++);

    // --- PAGE 5: INCOME ---
    doc.addPage();
    addHeader('PROJECT INCOME');
    
    if (projectData.income.length > 0) {
      const incomeRows = projectData.income.map((i) => {
        const amount = Number(i.amount || 0);
        const gstAmount = Number(i.gst_amount || 0);
        const totalAmount = amount + gstAmount;
        
        return [
          i.phases?.name || 'No Phase',
          i.category || 'Uncategorized',
          `Rs ${amount.toLocaleString()}`,
          gstAmount > 0 ? `Rs ${gstAmount.toLocaleString()}` : 'No GST',
          `Rs ${totalAmount.toLocaleString()}`,
          i.date ? new Date(i.date).toLocaleDateString() : 'No Date',
          i.payment_method || 'Not Specified'
        ];
      });
      
      const totalIncome = projectData.income.reduce((sum, i) => {
        const amount = Number(i.amount || 0);
        const gstAmount = Number(i.gst_amount || 0);
        return sum + amount + gstAmount;
      }, 0);
      
      (doc as any).autoTable({
        head: [['Phase', 'Category', 'Amount', 'GST', 'Total', 'Date', 'Payment Method']],
        body: incomeRows,
        startY: 55,
        theme: 'striped',
        headStyles: {
          fillColor: [46, 204, 113],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 22, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' }
        }
      });
      
      // Add total income box
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(46, 204, 113);
      doc.rect(pageWidth - margin - 100, finalY, 100, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Total Income: Rs ${totalIncome.toLocaleString()}`, pageWidth - margin - 95, finalY + 10);
    } else {
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('No income recorded for this project.', margin, 70);
    }
    
    addFooter(currentPageNum++);

    // --- PAGE 6: MATERIALS ---
    doc.addPage();
    addHeader('MATERIALS INVENTORY');
    
    if (projectData.materials.length > 0) {
      const materialRows = projectData.materials.map((m) => {
        const unitCost = Number(m.unit_cost || 0);
        const quantity = Number(m.qty_required || 0);
        return [
          m.name || 'Unnamed Material',
          unitCost > 0 ? `Rs ${unitCost.toLocaleString()}` : 'Rs 0',
          quantity.toString(),
          m.status || 'Unknown',
          m.updated_at ? new Date(m.updated_at).toLocaleDateString() : 'No Date'
        ];
      });
      
      const totalMaterialCost = projectData.materials.reduce((sum, m) => {
        const cost = Number(m.unit_cost || 0);
        const qty = Number(m.qty_required || 0);
        return sum + (cost * qty);
      }, 0);
      
      (doc as any).autoTable({
        head: [['Material Name', 'Unit Cost', 'Quantity', 'Status', 'Last Updated']],
        body: materialRows,
        startY: 55,
        theme: 'striped',
        headStyles: {
          fillColor: [241, 196, 15],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' }
        }
      });
      
      // Add total material cost
      if (totalMaterialCost > 0) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFillColor(241, 196, 15);
        doc.rect(pageWidth - margin - 100, finalY, 100, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total Value: Rs ${totalMaterialCost.toLocaleString()}`, pageWidth - margin - 95, finalY + 10);
      }
    } else {
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('No materials recorded for this project.', margin, 70);
    }
    
    addFooter(currentPageNum++);

    // --- PAGE 7: TEAM MEMBERS ---
    doc.addPage();
    addHeader('TEAM MEMBERS');
    
    if (projectData.teamMembers.length > 0) {
      const teamRows = projectData.teamMembers.map((t) => [
        t.name || t.full_name || 'Unknown Member',
        t.email || 'No Email',
        t.status || 'pending',
        t.active ? 'Active' : 'Inactive'
      ]);
      
      (doc as any).autoTable({
        head: [['Name', 'Email', 'Status', 'Active']],
        body: teamRows,
        startY: 55,
        theme: 'striped',
        headStyles: {
          fillColor: [155, 89, 182],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 60 },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' }
        }
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('No team members assigned to this project.', margin, 70);
    }
    
    addFooter(currentPageNum++);

    // --- PAGE 8: SUMMARY ---
    doc.addPage();
    addHeader('PROJECT SUMMARY');
    
    let summaryYPos = 60;
    
    // Calculate totals
    const totalExpenseAmount = projectData.expenses.reduce((sum, e) => {
      const amount = Number(e.amount || 0);
      const gstAmount = Number(e.gst_amount || 0);
      return sum + amount + gstAmount;
    }, 0);
    
    const totalIncomeAmount = projectData.income.reduce((sum, i) => {
      const amount = Number(i.amount || 0);
      const gstAmount = Number(i.gst_amount || 0);
      return sum + amount + gstAmount;
    }, 0);
    
    // Summary statistics
    const summaryData = [
      { label: 'Total Phases', value: projectData.phases.length.toString() },
      { label: 'Total Expenses', value: `Rs ${totalExpenseAmount.toLocaleString()}` },
      { label: 'Total Income', value: `Rs ${totalIncomeAmount.toLocaleString()}` },
      { label: 'Net Profit/Loss', value: `Rs ${(totalIncomeAmount - totalExpenseAmount).toLocaleString()}` },
      { label: 'Total Materials', value: projectData.materials.length.toString() },
      { label: 'Team Size', value: projectData.teamMembers.length.toString() },
      { label: 'Phase Photos', value: projectData.phasePhotos.length.toString() },
    ];
    
    summaryData.forEach((item, index) => {
      const boxX = margin + (index % 2) * (contentWidth / 2);
      const boxY = summaryYPos + Math.floor(index / 2) * 40;
      
      // Summary box
      const isProfit = item.label === 'Net Profit/Loss' && (totalIncomeAmount - totalExpenseAmount) >= 0;
      const boxColor = item.label === 'Net Profit/Loss' 
        ? (isProfit ? [46, 204, 113] : [231, 76, 60])
        : [52, 152, 219];
      
      doc.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
      doc.rect(boxX, boxY, contentWidth / 2 - 10, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, boxX + 10, boxY + 12);
      
      doc.setFontSize(18);
      doc.text(item.value, boxX + 10, boxY + 25);
    });
    
    // Project status summary
    summaryYPos += 160;
    doc.setTextColor(52, 73, 94);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT STATUS OVERVIEW:', margin, summaryYPos);
    
    summaryYPos += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const statusText = [
      `• Project "${project.name}" is currently ${project.status.toUpperCase()}`,
      `• Started: ${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not specified'}`,
      `• Expected completion: ${project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not specified'}`,
      `• Total expenses: Rs ${totalExpenseAmount.toLocaleString()}`,
      `• Total income: Rs ${totalIncomeAmount.toLocaleString()}`,
      `• Net result: Rs ${(totalIncomeAmount - totalExpenseAmount).toLocaleString()} ${totalIncomeAmount >= totalExpenseAmount ? '(Profit)' : '(Loss)'}`,
      `• Active team members: ${projectData.teamMembers.filter(t => t.active !== false).length}`,
      `• Phases in progress: ${projectData.phases.filter(p => p.status === 'In Progress').length}`,
      `• Total phase photos: ${projectData.phasePhotos.length}`,
    ];
    
    statusText.forEach((text, index) => {
      doc.text(text, margin, summaryYPos + (index * 8));
    });
    
    addFooter(currentPageNum);

    // Save with formatted filename
    const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Project_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  // Generate share link
  const generateShareLink = async (project: any, type: 'public' | 'private', password?: string) => {
    try {
      console.log('🔍 generateShareLink called with:', { project: project?.name, type, hasPassword: !!password });
      
      const shareId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const shareData = {
        id: shareId,
        project_id: project.id,
        created_by: profileId,
        share_type: type,
        password: password || null,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      };

      console.log('🔍 Inserting share data:', shareData);
      const { error } = await supabase
        .from('project_shares')
        .insert([shareData]);

      if (error) throw error;

      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/shared/${shareId}`;
      
      console.log('✅ Share link generated successfully:', shareUrl);
      setGeneratedLink(shareUrl);
      return shareUrl;
    } catch (error: any) {
      console.error('Error generating share link:', error.message);
      console.error('Full error:', error);
      alert('Error generating share link: ' + error.message);
      return null;
    }
  };

  // Handle share button click
  const handleShare = (project: any) => {
    setSharingProject(project);
    setShareModalOpen(true);
    setShareType(null);
    setSharePassword('');
    setGeneratedLink('');
    setLinkCopied(false);
  };

  // Handle share type selection
  const handleShareTypeSelect = async (type: 'public' | 'private') => {
    setShareType(type);
    
    if (type === 'public') {
      const link = await generateShareLink(sharingProject, 'public');
      if (link) {
        setGeneratedLink(link);
      }
    }
    // For private links, we don't generate immediately - we wait for password
  };

  // Handle private share with password
  const handlePrivateShare = async () => {
    if (!sharePassword.trim()) {
      alert('Please enter a password');
      return;
    }
    
    console.log('🔍 Generating private share link...');
    console.log('🔍 Project:', sharingProject?.name);
    console.log('🔍 Password:', sharePassword);
    
    const link = await generateShareLink(sharingProject, 'private', sharePassword);
    if (link) {
      console.log('✅ Private link generated:', link);
      setGeneratedLink(link);
    } else {
      console.error('❌ Failed to generate private link');
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy link to clipboard');
    }
  };

  // ✅ Apply search + filter
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "All" ? true : p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <Layout title="Projects">
      <div className="space-y-6">
        {/* Search + Add + Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg p-2"
            >
              <option value="All">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <button
            onClick={() => {
              setEditingProject(null);
              setNewProject({
                name: "",
                description: "",
                status: "pending",
                location: "",
                start_date: "",
                end_date: "",
              });
              setIsModalOpen(true);
            }}
            className="mt-2 sm:mt-0 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>

        {loading && (
          <div className="text-center text-gray-500">Loading...</div>
        )}

        {!loading && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white p-6 shadow rounded-lg border-2 border-gray-300 space-y-2"
              >
                <h3 className="text-lg font-medium">{project.name}</h3>
                <p className="text-sm text-gray-600">
                  Status: {project.status} | Location: {project.location || "-"}
                </p>
                <p className="text-sm text-gray-600">
                  Start: {project.start_date || "-"} | End:{" "}
                  {project.end_date || "-"}
                </p>
                <p className="text-sm text-gray-600">
                  Description: {project.description || "-"}
                </p>

                <div className="flex gap-2 pt-3 flex-wrap">
                  <button
                    onClick={() => handleViewProject(project)}
                    className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-lg"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadReport(project)}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => handleShare(project)}
                    className="flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded-lg"
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(project);
                      setNewProject({
                        name: project.name,
                        description: project.description,
                        status: project.status,
                        location: project.location,
                        start_date: project.start_date,
                        end_date: project.end_date,
                      });
                      setIsModalOpen(true);
                    }}
                    className="flex items-center px-3 py-1 bg-yellow-500 text-white text-sm rounded-lg"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <div className="text-center text-gray-500">No projects found</div>
        )}
      </div>

      {/* ✅ Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {editingProject ? "Edit Project" : "Add New Project"}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Project Name"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
                className="w-full border rounded-lg p-2"
              />
              <textarea
                placeholder="Description"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
                className="w-full border rounded-lg p-2"
              />
              <input
                type="text"
                placeholder="Location"
                value={newProject.location}
                onChange={(e) =>
                  setNewProject({ ...newProject, location: e.target.value })
                }
                className="w-full border rounded-lg p-2"
              />
              <select
                value={newProject.status}
                onChange={(e) =>
                  setNewProject({ ...newProject, status: e.target.value })
                }
                className="w-full border rounded-lg p-2"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <input
                type="date"
                value={newProject.start_date}
                onChange={(e) =>
                  setNewProject({ ...newProject, start_date: e.target.value })
                }
                className="w-full border rounded-lg p-2"
              />
              <input
                type="date"
                value={newProject.end_date}
                onChange={(e) =>
                  setNewProject({ ...newProject, end_date: e.target.value })
                }
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ View Project Modal */}
      {viewingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Project Details</h2>
              <button onClick={() => setViewingProject(null)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Overview</h2>
              <p>Status: {viewingProject.status}</p>
              <p>Location: {viewingProject.location || "-"}</p>
              <p>
                Start: {viewingProject.start_date || "-"} | End:{" "}
                {viewingProject.end_date || "-"}
              </p>
              <p>Description: {viewingProject.description || "-"}</p>

              <h2 className="text-xl font-bold">Phases</h2>
              {phases.length > 0 ? (
                phases.map((p) => (
                  <div key={p.id}>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p>
                      {p.start_date} → {p.end_date} | {p.status}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No phases</p>
              )}

              <h2 className="text-xl font-bold">Phase Photos</h2>
              {phasePhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {phasePhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <img
                        src={photo.photo_url}
                        alt="Phase photo"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <p className="text-sm text-gray-600">
                        Phase: {photo.phases?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {photo.created_at ? new Date(photo.created_at).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No phase photos</p>
              )}

              {/* Separate Expenses Section */}
              <h2 className="text-xl font-bold text-red-600">Expenses</h2>
              {expenses.length > 0 ? (
                <>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-red-50">
                        <th className="border p-2 text-left">Phase</th>
                        <th className="border p-2 text-left">Category</th>
                        <th className="border p-2 text-left">Amount</th>
                        <th className="border p-2 text-left">GST</th>
                        <th className="border p-2 text-left">Total</th>
                        <th className="border p-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => {
                        const amount = Number(e.amount || 0);
                        const gstAmount = Number(e.gst_amount || 0);
                        const total = amount + gstAmount;
                        return (
                          <tr key={e.id}>
                            <td className="border p-2">
                              {e.phases?.name || "-"}
                            </td>
                            <td className="border p-2">{e.category}</td>
                            <td className="border p-2 text-red-600">
                              ₹{amount.toLocaleString()}
                            </td>
                            <td className="border p-2 text-red-600">
                              {gstAmount > 0 ? `₹${gstAmount.toLocaleString()}` : 'No GST'}
                            </td>
                            <td className="border p-2 text-red-600 font-semibold">
                              ₹{total.toLocaleString()}
                            </td>
                            <td className="border p-2">{e.date || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="font-semibold mt-2 text-red-600">
                    Total Expenses: ₹
                    {expenses
                      .reduce((sum, e) => {
                        const amount = Number(e.amount || 0);
                        const gstAmount = Number(e.gst_amount || 0);
                        return sum + amount + gstAmount;
                      }, 0)
                      .toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">No expenses</p>
              )}

              {/* Separate Income Section */}
              <h2 className="text-xl font-bold text-green-600">Income</h2>
              {income.length > 0 ? (
                <>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="border p-2 text-left">Phase</th>
                        <th className="border p-2 text-left">Category</th>
                        <th className="border p-2 text-left">Amount</th>
                        <th className="border p-2 text-left">GST</th>
                        <th className="border p-2 text-left">Total</th>
                        <th className="border p-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map((i) => {
                        const amount = Number(i.amount || 0);
                        const gstAmount = Number(i.gst_amount || 0);
                        const total = amount + gstAmount;
                        return (
                          <tr key={i.id}>
                            <td className="border p-2">
                              {i.phases?.name || "-"}
                            </td>
                            <td className="border p-2">{i.category}</td>
                            <td className="border p-2 text-green-600">
                              ₹{amount.toLocaleString()}
                            </td>
                            <td className="border p-2 text-green-600">
                              {gstAmount > 0 ? `₹${gstAmount.toLocaleString()}` : 'No GST'}
                            </td>
                            <td className="border p-2 text-green-600 font-semibold">
                              ₹{total.toLocaleString()}
                            </td>
                            <td className="border p-2">{i.date || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="font-semibold mt-2 text-green-600">
                    Total Income: ₹
                    {income
                      .reduce((sum, i) => {
                        const amount = Number(i.amount || 0);
                        const gstAmount = Number(i.gst_amount || 0);
                        return sum + amount + gstAmount;
                      }, 0)
                      .toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">No income</p>
              )}

              <h2 className="text-xl font-bold">Materials</h2>
              {materials.length > 0 ? (
                <ul className="space-y-2">
                  {materials.map((m) => (
                    <li key={m.id} className="flex items-center">
                      <File className="h-4 w-4 mr-2 text-gray-500" />
                      <span>
                        {m.name} - {m.qty_required || 0} units @{" "}
                        {m.unit_cost ? `₹${m.unit_cost}` : "N/A"} (
                        {m.status || "Unknown"})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No materials</p>
              )}

              <h2 className="text-xl font-bold">Team Members</h2>
              {teamMembers.length > 0 ? (
                <ul className="space-y-2">
                  {teamMembers.map((t) => (
                    <li key={t.id} className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      {t.name || t.full_name || "Unknown"} -{" "}
                      {t.role_id || t.role ? "Role Assigned" : "No Role"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No team members</p>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Share Project</h2>
              <button onClick={() => setShareModalOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {!shareType && (
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-800">
                  How would you like to share "{sharingProject?.name}"?
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleShareTypeSelect('public')}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Globe className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Public Link</h4>
                        <p className="text-sm text-gray-600">Anyone with the link can view (24h expiry)</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleShareTypeSelect('private')}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Lock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Private Link</h4>
                        <p className="text-sm text-gray-600">Password protected (24h expiry)</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {shareType === 'private' && !generatedLink && (
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-800">Set Password</h3>
                <input
                  type="password"
                  placeholder="Enter password for the link"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  className="w-full border rounded-lg p-3"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShareType(null)}
                    className="flex-1 px-4 py-2 rounded-lg border"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePrivateShare}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white"
                  >
                    Generate Link
                  </button>
                </div>
              </div>
            )}

            {generatedLink && (
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-800">
                  {shareType === 'public' ? 'Public' : 'Private'} Link Generated
                </h3>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 break-all">{generatedLink}</p>
                </div>

                {shareType === 'private' && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      <strong>Password:</strong> {sharePassword}
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    ⏰ This link will expire in 24 hours
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                  
                  <button
                    onClick={() => window.open(generatedLink, '_blank')}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Open Link
                  </button>
                </div>

                
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}