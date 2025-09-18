// src/pages/Reports.tsx
import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { FileText, Download } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "../contexts/AuthContext";

const COLORS = ["#4CAF50", "#FF9800", "#F44336", "#2196F3", "#9C27B0"];

interface Expense {
  id: number;
  category: string;
  amount: number;
  date: string;
  phase_id?: string;
  phase_name?: string;
  project_id?: string;
}

interface Material {
  id: number;
  name: string;
  qty_required: number;
  unit_cost: number;
  total_cost: number;
  project_id?: string;
  phase_id?: string;
  phase_name?: string;
}

interface Phase {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  project_id?: string;
}

interface Project {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
}

export function Reports() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewingProjectId, setViewingProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (viewingProjectId) {
      fetchProjectData(viewingProjectId);
    } else {
      setExpenses([]);
      setMaterials([]);
      setPhases([]);
      setLoading(false);
    }
  }, [viewingProjectId]);

  async function fetchProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, start_date, end_date, created_by")
      .eq("created_by", user?.id)
      .order("name");
    if (error) console.error("Error fetching projects:", error.message);
    setProjects(data || []);
  }

  async function fetchProjectData(projectId: string) {
    setLoading(true);

    const { data: expensesData } = await supabase
      .from("expenses")
      .select(
        `id, category, amount, date, phase_id, phases (id, name, project_id)`
      )
      .eq("phases.project_id", projectId)
      .order("date", { ascending: false });

    const formattedExpenses = (expensesData || []).map((e: any) => ({
      id: e.id,
      category: e.category || "Uncategorized",
      amount: e.amount || 0,
      date: e.date || new Date().toISOString().split("T")[0],
      phase_id: e.phase_id,
      phase_name: e.phases?.name || "Uncategorized",
      project_id: e.phases?.project_id,
    }));
    setExpenses(formattedExpenses);

    const { data: materialsData } = await supabase
      .from("materials")
      .select("id, name, qty_required, unit_cost, project_id, phase_id, phases (id, name)")
      .eq("project_id", projectId);

    const formattedMaterials = (materialsData || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      qty_required: m.qty_required || 0,
      unit_cost: m.unit_cost || 0,
      total_cost: (m.qty_required || 0) * (m.unit_cost || 0),
      project_id: m.project_id,
      phase_id: m.phase_id,
      phase_name: m.phases?.name || "Unassigned",
    }));
    setMaterials(formattedMaterials);

    const { data: phasesData } = await supabase
      .from("phases")
      .select("id, name, start_date, end_date, status, project_id")
      .eq("project_id", projectId);
    setPhases(phasesData || []);

    setLoading(false);
  }

  function getExpenseChartData() {
    const grouped: { [key: string]: number } = {};
    expenses.forEach((e) => {
      if (e.category && e.project_id === viewingProjectId) {
        grouped[e.category] = (grouped[e.category] || 0) + e.amount;
      }
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }

  function getMaterialChartData() {
    const grouped: { [key: string]: number } = {};
    materials.forEach((m) => {
      if (m.project_id === viewingProjectId) {
        grouped[m.name] = (grouped[m.name] || 0) + m.total_cost;
      }
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }

  function generateSummary() {
    const totalExpenses = expenses
      .filter((e) => e.project_id === viewingProjectId)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalMaterials = materials
      .filter((m) => m.project_id === viewingProjectId)
      .reduce((sum, m) => sum + (m.total_cost || 0), 0);
    const completedPhases = phases.filter((p) => p.status === "Completed").length;
    const totalPhases = phases.length;

    return {
      totalExpenses,
      totalMaterials,
      completedPhases,
      totalPhases,
      percentage:
        totalPhases > 0 ? ((completedPhases / totalPhases) * 100).toFixed(0) : "0",
    };
  }

  // -------------------- PDF EXPORT --------------------
  async function downloadPDF() {
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    const project = projects.find((p) => p.id === viewingProjectId);
    const projectName = project?.name || "Project";

    // ✅ Page 1: Project Summary
    doc.setFontSize(20);
    doc.text("Construction Project Report", pageWidth / 2, 40, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Project Name: ${projectName}`, 40, 80);
    doc.text(`Start Date: ${project?.start_date || "-"}`, 40, 100);
    doc.text(`End Date: ${project?.end_date || "-"}`, 40, 120);
    doc.text(`Report Date: ${new Date().toLocaleDateString("en-IN")}`, 40, 140);
    doc.text(`Prepared By: ${user?.email || "System"}`, 40, 160);

    const summary = generateSummary();
    doc.setFontSize(14);
    doc.text("Summary", 40, 200);
    doc.setFontSize(11);
    doc.text(
      [
        `Total Expenses: ₹${summary.totalExpenses.toFixed(2)}`,
        `Total Materials: ₹${summary.totalMaterials.toFixed(2)}`,
        `Phases Completed: ${summary.completedPhases}/${summary.totalPhases} (${summary.percentage}%)`,
      ],
      40,
      220
    );

    // ✅ Page 2: Phases
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Phases Overview", 40, 40);
    (doc as any).autoTable({
      startY: 60,
      head: [["Phase", "Start Date", "End Date", "Status", "Progress %"]],
      body: phases.map((p) => [
        p.name,
        p.start_date,
        p.end_date,
        p.status,
        p.status === "Completed" ? "100%" : "0%",
      ]),
    });

    // ✅ Page 3: Expenses
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Expenses (Phase-wise)", 40, 40);
    phases.forEach((phase) => {
      const phaseExpenses = expenses.filter((e) => e.phase_id === phase.id);
      if (phaseExpenses.length > 0) {
        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable?.finalY + 20 || 60,
          head: [[`Phase: ${phase.name}`, "", ""]],
          body: [],
        });
        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [["Category", "Amount (₹)", "Date"]],
          body: phaseExpenses.map((e) => [e.category, e.amount.toFixed(2), e.date]),
        });
      }
    });

    // ✅ Page 4: Materials
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Materials (Phase-wise)", 40, 40);
    phases.forEach((phase) => {
      const phaseMaterials = materials.filter((m) => m.phase_id === phase.id);
      if (phaseMaterials.length > 0) {
        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable?.finalY + 20 || 60,
          head: [[`Phase: ${phase.name}`, "", "", ""]],
          body: [],
        });
        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [["Material", "Qty", "Unit Cost (₹)", "Total (₹)"]],
          body: phaseMaterials.map((m) => [
            m.name,
            m.qty_required,
            m.unit_cost.toFixed(2),
            m.total_cost.toFixed(2),
          ]),
        });
      }
    });

    doc.save(`report_${projectName}.pdf`);
  }

  // -------------------- EXCEL EXPORT --------------------
  function downloadExcel() {
    const project = projects.find((p) => p.id === viewingProjectId);
    const projectName = project?.name || "Project";
    const summary = generateSummary();
    const wb = XLSX.utils.book_new();

    // ✅ Summary
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Project Summary"],
      ["Project Name", projectName],
      ["Start Date", project?.start_date || "-"],
      ["End Date", project?.end_date || "-"],
      ["Total Expenses", summary.totalExpenses],
      ["Total Materials", summary.totalMaterials],
      [
        "Phases Progress",
        `${summary.completedPhases}/${summary.totalPhases} (${summary.percentage}%)`,
      ],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // ✅ Phases
    const phaseSheet = XLSX.utils.json_to_sheet(
      phases.map((p) => ({
        Phase: p.name,
        Status: p.status,
        Start_Date: p.start_date,
        End_Date: p.end_date,
        Progress: p.status === "Completed" ? "100%" : "0%",
      }))
    );
    XLSX.utils.book_append_sheet(wb, phaseSheet, "Phases");

    // ✅ Expenses
    const expenseSheet = XLSX.utils.json_to_sheet(
      expenses.map((e) => ({
        Phase: e.phase_name,
        Category: e.category,
        Amount: e.amount,
        Date: e.date,
      }))
    );
    XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");

    // ✅ Materials
    const materialSheet = XLSX.utils.json_to_sheet(
      materials.map((m) => ({
        Phase: m.phase_name,
        Material: m.name,
        Quantity: m.qty_required,
        Unit_Cost: m.unit_cost,
        Total_Cost: m.total_cost,
      }))
    );
    XLSX.utils.book_append_sheet(wb, materialSheet, "Materials");

    XLSX.writeFile(wb, `report_${projectName}.xlsx`);
  }

  const expenseChartData = getExpenseChartData();
  const materialChartData = getMaterialChartData();

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <FileText className="w-6 h-6" /> Reports
        </h1>

        {projects.length === 0 ? (
          <p>No projects found.</p>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Projects</h2>
              <ul className="space-y-2">
                {projects.map((project) => (
                  <li
                    key={project.id}
                    className="flex justify-between items-center border p-3 rounded"
                  >
                    <span>{project.name}</span>
                    <button
                      onClick={() => setViewingProjectId(project.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      View Report
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {viewingProjectId && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    Report for {projects.find((p) => p.id === viewingProjectId)?.name}
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={downloadPDF}
                      className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button
                      onClick={downloadExcel}
                      className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4" /> Download Excel
                    </button>
                  </div>
                </div>

                {loading ? (
                  <p>Loading...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 rounded shadow flex justify-center">
                      <PieChart width={400} height={350}>
                        <Pie
                          data={expenseChartData}
                          cx={200}
                          cy={150}
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {expenseChartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="horizontal" align="center" />
                      </PieChart>
                    </div>
                    <div className="bg-white p-4 rounded shadow flex justify-center">
                      <PieChart width={400} height={350}>
                        <Pie
                          data={materialChartData}
                          cx={200}
                          cy={150}
                          labelLine={false}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {materialChartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="horizontal" align="center" />
                      </PieChart>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
