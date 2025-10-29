import React, { useState, useEffect } from "react";
import { Search, Download, FileText, Calendar, Filter } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import jsPDF from "jspdf";
import "jspdf-autotable";

export function Reports() {
  const { user, userRole, permissions } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  });

  // Permission helper function
  const hasPermission = (requiredPermission: string | string[]) => {
    // Admin always has access
    if (userRole === "Admin") {
      return true;
    }

    // Check permissions
    if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(perm => permissions.includes(perm));
    }

    return permissions.includes(requiredPermission);
  };

  useEffect(() => {
    if (user) setProfileId(user.id);
  }, [user]);

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

  const fetchProjectDetails = async (projectId: string) => {
    const { data: phaseData } = await supabase
      .from("phases")
      .select("*")
      .eq("project_id", projectId);

    const { data: expenseData } = await supabase
      .from("expenses")
      .select("*, phase:phase_id(name)")
      .eq("project_id", projectId);

    const { data: materialData } = await supabase
      .from("materials")
      .select("id, name, unit_cost, qty_required, status, updated_at")
      .eq("project_id", projectId);

    const { data: teamData } = await supabase
      .from("users")
      .select("id, name, email, role_id")
      .eq("project_id", projectId)
      .eq("created_by", profileId);

    return {
      phases: phaseData || [],
      expenses: expenseData || [],
      materials: materialData || [],
      teamMembers: teamData || []
    };
  };

  const generateProjectReport = async (project: any) => {
    const { phases, expenses, materials, teamMembers } = await fetchProjectDetails(project.id);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    const addHeader = (title: string) => {
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT REPORT', margin, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin - 60, 20);
      
      doc.setTextColor(41, 128, 185);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, 45);
      
      doc.setTextColor(0, 0, 0);
    };

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 10);
      doc.text(`${project.name} - Project Report`, margin, pageHeight - 10);
    };

    // PAGE 1: PROJECT OVERVIEW (CENTERED)
    addHeader('PROJECT OVERVIEW');
    
    let yPos = 80;
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 73, 94);
    const projectNameWidth = doc.getTextWidth(project.name);
    doc.text(project.name, (pageWidth - projectNameWidth) / 2, yPos);
    yPos += 25;
    
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
    
    doc.setTextColor(52, 73, 94);
    doc.setFont('helvetica', 'bold');
    const descLabelWidth = doc.getTextWidth('DESCRIPTION:');
    doc.text('DESCRIPTION:', (pageWidth - descLabelWidth) / 2, yPos);
    yPos += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const description = project.description || 'No description provided';
    const splitDescription = doc.splitTextToSize(description, boxWidth);
    
    splitDescription.forEach((line: string, index: number) => {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, (pageWidth - lineWidth) / 2, yPos + (index * 6));
    });
    
    addFooter(1);

    // PAGE 2: PHASES
    doc.addPage();
    addHeader('PROJECT PHASES');
    
    if (phases.length > 0) {
      const phaseRows = phases.map((p) => {
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
    
    addFooter(2);

    // PAGE 3: EXPENSES
    doc.addPage();
    addHeader('PROJECT EXPENSES');
    
    if (expenses.length > 0) {
      const expenseRows = expenses.map((e) => {
        const amount = Number(e.amount || 0);
        return [
          e.phase?.name || 'No Phase',
          e.category || 'Uncategorized',
          `Rs ${amount.toLocaleString()}`,
          e.date ? new Date(e.date).toLocaleDateString() : 'No Date',
          e.payment_method || 'Not Specified'
        ];
      });
      
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
      (doc as any).autoTable({
        head: [['Phase', 'Category', 'Amount', 'Date', 'Payment Method']],
        body: expenseRows,
        startY: 55,
        theme: 'striped',
        headStyles: {
          fillColor: [46, 204, 113],
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
          0: { cellWidth: 40 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 35, halign: 'center' }
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(46, 204, 113);
      doc.rect(pageWidth - margin - 80, finalY, 80, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Total: Rs ${totalExpenses.toLocaleString()}`, pageWidth - margin - 75, finalY + 10);
    } else {
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('No expenses recorded for this project.', margin, 70);
    }
    
    addFooter(3);

    // PAGE 4: MATERIALS
    doc.addPage();
    addHeader('MATERIALS INVENTORY');
    
    if (materials.length > 0) {
      const materialRows = materials.map((m) => {
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
      
      const totalMaterialCost = materials.reduce((sum, m) => {
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
    
    addFooter(4);

    // PAGE 5: TEAM MEMBERS
    doc.addPage();
    addHeader('TEAM MEMBERS');
    
    if (teamMembers.length > 0) {
      const teamRows = teamMembers.map((t) => [
        t.name || 'Unknown Member',
        t.email || 'No Email',
        t.role_id ? 'Role Assigned' : 'No Role',
        t.active ? 'Active' : 'Inactive'
      ]);
      
      (doc as any).autoTable({
        head: [['Name', 'Email', 'Role Status', 'Status']],
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
    
    addFooter(5);

    // PAGE 6: SUMMARY
    doc.addPage();
    addHeader('PROJECT SUMMARY');
    
    yPos = 60;
    
    const summaryData = [
      { label: 'Total Phases', value: phases.length.toString() },
      { label: 'Total Expenses', value: `Rs ${expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}` },
      { label: 'Total Materials', value: materials.length.toString() },
      { label: 'Team Size', value: teamMembers.length.toString() },
    ];
    
    summaryData.forEach((item, index) => {
      const boxX = margin + (index % 2) * (contentWidth / 2);
      const boxY = yPos + Math.floor(index / 2) * 40;
      
      doc.setFillColor(52, 152, 219);
      doc.rect(boxX, boxY, contentWidth / 2 - 10, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, boxX + 10, boxY + 12);
      
      doc.setFontSize(18);
      doc.text(item.value, boxX + 10, boxY + 25);
    });
    
    yPos += 100;
    
    doc.setTextColor(52, 73, 94);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT STATUS OVERVIEW:', margin, yPos);
    
    yPos += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const statusText = [
      `• Project "${project.name}" is currently ${project.status.toUpperCase()}`,
      `• Started: ${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not specified'}`,
      `• Expected completion: ${project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not specified'}`,
      `• Total budget spent: Rs ${expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}`,
      `• Active team members: ${teamMembers.filter(t => t.active).length}`,
      `• Phases in progress: ${phases.filter(p => p.status === 'In Progress').length}`,
    ];
    
    statusText.forEach((text, index) => {
      doc.text(text, margin, yPos + (index * 8));
    });
    
    addFooter(6);

    const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const generateConsolidatedReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    const addHeader = (title: string) => {
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CONSOLIDATED REPORT', margin, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin - 60, 20);
      
      doc.setTextColor(41, 128, 185);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, 45);
      
      doc.setTextColor(0, 0, 0);
    };

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 10);
      doc.text('Consolidated Report - All Projects', margin, pageHeight - 10);
    };

    // PAGE 1: OVERVIEW
    addHeader('ALL PROJECTS OVERVIEW');
    
    let yPos = 60;
    
    const filteredProjects = projects.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === "All" ? true : p.status === filterStatus;
      const matchesDate = (!dateRange.startDate || new Date(p.start_date) >= new Date(dateRange.startDate)) &&
                         (!dateRange.endDate || new Date(p.end_date) <= new Date(dateRange.endDate));
      return matchesSearch && matchesFilter && matchesDate;
    });

    if (filteredProjects.length > 0) {
      const projectRows = filteredProjects.map((p) => [
        p.name || 'Unnamed Project',
        p.status || 'Unknown',
        p.location || 'Not specified',
        p.start_date ? new Date(p.start_date).toLocaleDateString() : 'Not set',
        p.end_date ? new Date(p.end_date).toLocaleDateString() : 'Not set'
      ]);
      
      (doc as any).autoTable({
        head: [['Project Name', 'Status', 'Location', 'Start Date', 'End Date']],
        body: projectRows,
        startY: yPos,
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
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 40 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' }
        }
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('No projects found matching the criteria.', margin, yPos);
    }
    
    addFooter(1);

    const fileName = `Consolidated_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "All" ? true : p.status === filterStatus;
    const matchesDate = (!dateRange.startDate || new Date(p.start_date) >= new Date(dateRange.startDate)) &&
                       (!dateRange.endDate || new Date(p.end_date) <= new Date(dateRange.endDate));
    return matchesSearch && matchesFilter && matchesDate;
  });

  return (
    <Layout title="Reports">
      <div className="">
        {/* Header */}
        <div className="mb-6">
         
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>

            <input
              type="date"
              placeholder="Start Date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <input
              type="date"
              placeholder="End Date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            {hasPermission('generate_reports') && (
              <button
                onClick={generateConsolidatedReport}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Consolidated Report
              </button>
            )}
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Individual Project Reports</h2>
            <p className="text-gray-600 mt-1">Generate detailed reports for specific projects</p>
          </div>

          {loading && (
            <div className="p-6 text-center text-gray-500">Loading projects...</div>
          )}

          {!loading && filteredProjects.length > 0 && (
            <div className="divide-y">
              {filteredProjects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No start date'}
                        </span>
                        <span>{project.location || 'No location'}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{project.description || 'No description'}</p>
                    </div>
                    <div className="ml-4">
                      {hasPermission('generate_reports') && (
                        <button
                          onClick={() => generateProjectReport(project)}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredProjects.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No projects found matching your criteria
            </div>
          )}
        </div>
      </div>
      
    </Layout>
  );
}