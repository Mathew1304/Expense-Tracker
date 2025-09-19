import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, X, Eye, Download, File, User } from "lucide-react";
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
  const [materials, setMaterials] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

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

  // ✅ Fetch Phases, Expenses, Materials, Team Members for a project
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

    const { data: teamData, error: teamError } = await supabase
      .from("users")
      .select("id, name, email, role_id")
      .eq("project_id", projectId)
      .eq("created_by", profileId);

    if (teamError) {
      console.error("Fetch team members error:", teamError.message);
    }

    setPhases(phaseData || []);
    setExpenses(expenseData || []);
    setMaterials(materialData || []);
    setTeamMembers(teamData || []);
  };

  const handleViewProject = async (project: any) => {
    setViewingProject(project);
    await fetchProjectDetails(project.id);
  };

  // ✅ PDF Download
  const handleDownloadReport = async (project: any) => {
    await fetchProjectDetails(project.id);

    const doc = new jsPDF();

    // --- PAGE 1: Project Info ---
    doc.setFontSize(18);
    doc.text("Project Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Project Name: ${project.name}`, 14, 35);
    doc.text(`Location: ${project.location || "-"}`, 14, 45);
    doc.text(`Status: ${project.status}`, 14, 55);
    doc.text(`Start Date: ${project.start_date || "-"}`, 14, 65);
    doc.text(`End Date: ${project.end_date || "-"}`, 14, 75);
    doc.text(`Description: ${project.description || "-"}`, 14, 85);

    // --- PAGE 2: Phases ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Phases", 14, 20);
    const phaseRows = phases.map((p) => [
      p.name,
      p.status,
      p.start_date || "-",
      p.end_date || "-",
    ]);
    (doc as any).autoTable({
      head: [["Name", "Status", "Start Date", "End Date"]],
      body: phaseRows,
      startY: 30,
    });

    // --- PAGE 3: Expenses ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Expenses", 14, 20);
    const expenseRows = expenses.map((e) => [
      e.phase?.name || "-",
      e.category,
      `₹${e.amount.toLocaleString()}`,
      e.date || "-",
    ]);
    (doc as any).autoTable({
      head: [["Phase", "Category", "Amount", "Date"]],
      body: expenseRows,
      startY: 30,
    });

    // --- PAGE 4: Materials ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Materials", 14, 20);
    const materialRows = materials.map((m) => [
      m.name,
      m.unit_cost ? `₹${m.unit_cost.toLocaleString()}` : "-",
      m.qty_required || "-",
      m.status || "-",
      m.updated_at ? new Date(m.updated_at).toLocaleString() : "-",
    ]);
    (doc as any).autoTable({
      head: [["Name", "Unit Cost", "Quantity", "Status", "Last Updated"]],
      body: materialRows,
      startY: 30,
    });

    // --- PAGE 5: Team Members ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Team Members", 14, 20);
    const teamRows = teamMembers.map((t) => [
      t.name || "Unknown",
      t.role_id ? "Role Assigned" : "No Role",
    ]);
    (doc as any).autoTable({
      head: [["Name", "Role"]],
      body: teamRows,
      startY: 30,
    });

    doc.save(`${project.name}_report.pdf`);
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
                    onClick={() =>
                      setEditingProject(project) || setIsModalOpen(true)
                    }
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
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

              <h2 className="text-xl font-bold">Expenses</h2>
              {expenses.length > 0 ? (
                <>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 text-left">Phase</th>
                        <th className="border p-2 text-left">Category</th>
                        <th className="border p-2 text-left">Amount</th>
                        <th className="border p-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td className="border p-2">
                            {e.phase?.name || "-"}
                          </td>
                          <td className="border p-2">{e.category}</td>
                          <td className="border p-2">
                            ₹{e.amount.toLocaleString()}
                          </td>
                          <td className="border p-2">{e.date || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="font-semibold mt-2">
                    Total: ₹
                    {expenses
                      .reduce((sum, e) => sum + e.amount, 0)
                      .toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">No expenses</p>
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
                      {t.name || "Unknown"} -{" "}
                      {t.role_id ? "Role Assigned" : "No Role"}
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
    </Layout>
  );
}
