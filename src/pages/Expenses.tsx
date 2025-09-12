import React, { useState, useEffect } from "react";
import { Plus, Search, X, Trash, Edit2 } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";

interface Expense {
  id: string;
  phase_id: string;
  category: string;
  amount: number;
  date: string;
  phase_name: string;
  project_name: string;
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

export function Expenses() {
  const { user } = useAuth(); // ✅ current logged-in admin
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    phaseId: "",
    category: "Labour",
    amount: "",
    date: "",
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchPhases();
      fetchExpenses();
    }
  }, [projects]);

  async function fetchProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("created_by", user?.id); // ✅ only this admin's projects

    if (!error && data) {
      setProjects(data);
    }
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

  async function fetchExpenses() {
    if (projects.length === 0) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("expenses")
      .select(
        `id, phase_id, category, amount, date,
        phases (id, name, project_id, projects (id, name))`
      )
      .in(
        "project_id",
        projects.map((p) => p.id)
      ) // ✅ only admin's projects
      .order("date", { ascending: false });

    if (!error && data) {
      setExpenses(
        data.map((e: any) => ({
          id: e.id,
          phase_id: e.phase_id,
          category: e.category,
          amount: e.amount,
          date: e.date,
          phase_name: e.phases?.name || "No Phase",
          project_name: e.phases?.projects?.name || "No Project",
        }))
      );
    }
    setLoading(false);
  }

  const filteredPhases = phases.filter((p) => !formData.projectId || p.project_id === formData.projectId);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { projectId, phaseId, category, amount, date } = formData;

    if (!phaseId || !projectId) {
      alert("Please select a project and phase.");
      return;
    }

    const payload = {
      project_id: projectId, // ✅ link expense to project
      phase_id: phaseId,
      category,
      amount: parseFloat(amount),
      date,
    };

    const { error } = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert([payload]);

    if (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense.");
    } else {
      fetchExpenses();
      setShowForm(false);
      setEditingId(null);
      setFormData({ projectId: "", phaseId: "", category: "Labour", amount: "", date: "" });
    }
  };

  const handleEdit = (expense: Expense) => {
    const project = phases.find((p) => p.id === expense.phase_id)?.project_id || "";
    setFormData({
      projectId: project,
      phaseId: expense.phase_id,
      category: expense.category,
      amount: expense.amount.toString(),
      date: expense.date,
    });
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (!error) fetchExpenses();
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesProject = !selectedProject || e.project_name === selectedProject;
    const matchesSearch =
      !search ||
      e.project_name.toLowerCase().includes(search.toLowerCase()) ||
      e.phase_name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    return matchesProject && matchesSearch;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const currentExpenses = sortedExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Expenses</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            <Plus className="mr-2" size={18} /> Add Expense
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center mb-4 gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search expenses..."
              className="border p-2 rounded w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border p-2 rounded"
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
          <div className="text-lg font-semibold">Total: ₹{totalExpenses.toFixed(2)}</div>
        </div>

        {/* Expenses Table */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Project</th>
                <th className="p-2 border">Phase</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Amount</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentExpenses.map((e) => (
                <tr key={e.id}>
                  <td className="p-2 border">{e.project_name}</td>
                  <td className="p-2 border">{e.phase_name}</td>
                  <td className="p-2 border">{e.category}</td>
                  <td className="p-2 border">₹{e.amount.toFixed(2)}</td>
                  <td className="p-2 border">{format(new Date(e.date), "yyyy-MM-dd")}</td>
                  <td className="p-2 border flex gap-2">
                    <button onClick={() => handleEdit(e)}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(e.id)}>
                      <Trash size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {currentExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-2 border text-center">
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="mt-4 flex justify-center gap-4">
          <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingId ? "Edit Expense" : "Add Expense"}</h2>
                <button onClick={() => setShowForm(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-medium">Project</label>
                  <select
                    className="border p-2 rounded w-full"
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
                  <label className="block font-medium">Phase</label>
                  <select
                    className="border p-2 rounded w-full"
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
                  <label className="block font-medium">Category</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                  >
                    <option>Labour</option>
                    <option>Materials</option>
                    <option>Equipment</option>
                    <option>Transport</option>
                    <option>Misc</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="border p-2 rounded w-full"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium">Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded w-full"
                    value={formData.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    {editingId ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
