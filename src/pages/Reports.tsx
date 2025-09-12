import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { FileText, Download } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useAuth } from "../contexts/AuthContext";

const COLORS = ["#4CAF50", "#FF9800", "#F44336", "#2196F3", "#9C27B0"];

interface Expense {
  id: number;
  category: string;
  amount: number;
  date: string;
  phase_id?: string;
  project_id?: string;
}

interface Material {
  id: number;
  name: string;
  qty_required: number;
  unit_cost: number;
  total_cost: number;
  project_id?: string;
}

interface Phase {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  project_id?: string;
}

interface Project {
  id: string;
  name: string;
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
      .select("id, name")
      .eq("created_by", user?.id) // Filter for admin-created projects
      .order("name");
    if (error) {
      console.error("Error fetching projects:", error.message);
    } else {
      setProjects(data || []);
      console.log("Fetched Projects:", data);
    }
  }

  async function fetchProjectData(projectId: string) {
    setLoading(true);

    // Fetch Expenses with left join through phases to include all expenses
    const { data: expensesData, error } = await supabase
      .from("expenses")
      .select(`
        id,
        category,
        amount,
        date,
        phase_id,
        phases (
          id,
          project_id
        )
      `)
      .eq("phases.project_id", projectId)
      .order("date", { ascending: false });
    if (error) {
      console.error("Expenses Fetch Error:", error.message);
    }
    console.log("Raw Expenses Data:", expensesData);
    const formattedExpenses = (expensesData || []).map((e: any) => ({
      id: e.id,
      category: e.category || "Uncategorized",
      amount: e.amount || 0,
      date: e.date || new Date().toISOString().split("T")[0],
      phase_id: e.phase_id,
      project_id: e.phases?.project_id,
    }));
    setExpenses(formattedExpenses);
    console.log("Formatted Expenses:", formattedExpenses);

    // Fetch Materials
    const { data: materialsData } = await supabase
      .from("materials")
      .select("id, name, qty_required, unit_cost, project_id")
      .eq("project_id", projectId);
    const formattedMaterials = (materialsData || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      qty_required: m.qty_required || 0,
      unit_cost: m.unit_cost || 0,
      total_cost: (m.qty_required || 0) * (m.unit_cost || 0),
      project_id: m.project_id,
    }));
    setMaterials(formattedMaterials);

    // Fetch Phases
    const { data: phasesData } = await supabase
      .from("phases")
      .select("id, name, start_date, end_date, status, project_id")
      .eq("project_id", projectId);
    setPhases(phasesData || []);
    console.log("Fetched Phases:", phasesData);

    setLoading(false);
  }

  function getExpenseChartData() {
    const grouped: { [key: string]: number } = {};
    expenses.forEach((e) => {
      if (e.category && e.project_id === viewingProjectId) {
        grouped[e.category] = (grouped[e.category] || 0) + e.amount;
      }
    });
    const data = Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));
    console.log("Expense Chart Data:", data);
    return data;
  }

  function getMaterialChartData() {
    const grouped: { [key: string]: number } = {};
    materials.forEach((m) => {
      if (m.project_id === viewingProjectId) {
        grouped[m.name] = (grouped[m.name] || 0) + m.total_cost;
      }
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));
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

    return `Summary as of ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}:
- Total Expenses: ₹${totalExpenses.toFixed(2)}
- Total Materials Cost: ₹${totalMaterials.toFixed(2)}
- Phases: ${completedPhases} completed out of ${totalPhases} (${((completedPhases / totalPhases) * 100 || 0).toFixed(0)}%)
- Note: Ensure budget aligns with current expense and material trends.`;
  }

  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width - 28;
    let y = 20;

    doc.setFontSize(18);
    doc.text(
      `Report for ${projects.find((p) => p.id === viewingProjectId)?.name || "Selected Project"}`,
      14,
      y
    );
    y += 10;

    doc.setFontSize(12);
    doc.text("Generated on: September 10, 2025, 08:33 PM IST", 14, y);
    y += 15;

    // Summary
    doc.setFontSize(14);
    doc.text("Summary", 14, y);
    y += 10;
    const summaryLines = doc.splitTextToSize(generateSummary(), pageWidth);
    doc.setFontSize(11);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 7 + 10;

    // Expenses Pie Chart (Text Representation)
    doc.setFontSize(14);
    doc.text("Expenses Breakdown", 14, y);
    y += 10;
    doc.autoTable({
      startY: y,
      head: [["Category", "Amount"]],
      body: getExpenseChartData().map((e) => [e.name, `₹${e.value.toFixed(2)}`]),
      theme: "grid",
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    y = doc.autoTable.previous.finalY + 15;

    // Materials Pie Chart (Text Representation)
    doc.setFontSize(14);
    doc.text("Materials Breakdown", 14, y);
    y += 10;
    doc.autoTable({
      startY: y,
      head: [["Material", "Total Cost"]],
      body: getMaterialChartData().map((m) => [m.name, `₹${m.value.toFixed(2)}`]),
      theme: "grid",
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    y = doc.autoTable.previous.finalY + 15;

    // Expenses Table
    doc.setFontSize(14);
    doc.text("Expenses Details", 14, y);
    y += 10;
    doc.autoTable({
      startY: y,
      head: [["Category", "Amount", "Date"]],
      body: expenses
        .filter((e) => e.project_id === viewingProjectId)
        .map((e) => [e.category, e.amount.toFixed(2), e.date]),
      theme: "grid",
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });

    doc.save(
      `report_${projects.find((p) => p.id === viewingProjectId)?.name || "project"}.pdf`
    );
  }

  const expenseChartData = getExpenseChartData();
  const materialChartData = getMaterialChartData();

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" /> Reports
          </h1>
        </div>

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
                      className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
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
                  <button
                    onClick={downloadPDF}
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>

                {loading ? (
                  <p>Loading...</p>
                ) : expenses.length === 0 && materials.length === 0 && phases.length === 0 ? (
                  <p>No data found for the selected project.</p>
                ) : (
                  <>
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
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                          />
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
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                          />
                        </PieChart>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded shadow mb-6">
                      <h2 className="text-xl font-semibold mb-4">Summary</h2>
                      <p className="whitespace-pre-wrap">{generateSummary()}</p>
                    </div>

                    <div className="bg-white p-4 rounded shadow">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="p-2 border">Category</th>
                            <th className="p-2 border">Amount</th>
                            <th className="p-2 border">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses
                            .filter((e) => e.project_id === viewingProjectId)
                            .map((e) => (
                              <tr key={e.id}>
                                <td className="p-2 border">{e.category}</td>
                                <td className="p-2 border">{e.amount.toFixed(2)}</td>
                                <td className="p-2 border">{e.date}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}