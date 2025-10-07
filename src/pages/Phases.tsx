import React, { useState, useEffect } from "react";
import { Plus, CreditCard as Edit2, Trash2, X, AlertTriangle, Calendar, MapPin, User, File, Camera, DollarSign, TrendingUp, TrendingDown, Search, IndianRupee } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import imageCompression from "browser-image-compression";

type Project = { id: string; name: string };

type Phase = {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "Not Started" | "In Progress" | "Completed";
  estimated_cost?: number;
  contractor_name?: string;
};

type Expense = {
  id: string;
  phase_id: string;
  category: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
};

type PhasePhoto = {
  id: string;
  photo_url: string;
  created_at: string;
  uploaded_by: string;
};

type PhaseComment = {
  id: string;
  phase_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
  updated_at: string;
};

export function Phases() {
  const { userRole, user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [incomes, setIncomes] = useState<Record<string, Expense[]>>({});
  const [form, setForm] = useState({
    project_id: "",
    name: "",
    start_date: "",
    end_date: "",
    status: "Not Started" as "Not Started" | "In Progress" | "Completed",
    estimated_cost: "",
    contractor_name: "",
  });
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewPhase, setViewPhase] = useState<Phase | null>(null);
  const [phasePhotos, setPhasePhotos] = useState<PhasePhoto[]>([]);
  const [comments, setComments] = useState<PhaseComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = ["Admin", "Project Manager", "Site Engineer"].includes(
    userRole ?? ""
  );

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("created_by", user.id)
        .order("name");
      if (!error) setProjects(data || []);
    };
    fetchProjects();
  }, [user?.id]);

  // Fetch phases and their expenses
  const fetchPhases = async () => {
    if (!user?.id) return;
    
    // First get projects created by the logged-in admin
    const { data: adminProjects, error: projectsError } = await supabase
      .from("projects")
      .select("id")
      .eq("created_by", user.id);

    if (projectsError) {
      console.error("Error fetching admin projects:", projectsError.message);
      return;
    }

    if (!adminProjects || adminProjects.length === 0) {
      setPhases([]);
      return;
    }

    const adminProjectIds = adminProjects.map(p => p.id);

    const { data, error } = await supabase
      .from("phases")
      .select(
        `id, project_id, name, start_date, end_date, status, estimated_cost, contractor_name, projects!inner(name)`
      )
      .in("project_id", adminProjectIds)
      .order("start_date");

    if (error) return console.error("Error fetching phases:", error.message);

    const mapped: Phase[] = (data || []).map((p: any) => ({
      id: p.id,
      project_id: p.project_id,
      project_name: p.projects?.name || "",
      name: p.name,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      estimated_cost: p.estimated_cost,
      contractor_name: p.contractor_name,
    }));

    setPhases(mapped);

    // Fetch expenses per phase
    for (const phase of mapped) {
      const { data: allTransactions } = await supabase
        .from("expenses")
        .select("*")
        .eq("phase_id", phase.id);
      
      const transactions = allTransactions || [];
      const expenses = transactions.filter(t => t.type === 'expense' || !t.type);
      const incomes = transactions.filter(t => t.type === 'income');
      
      setExpenses((prev) => ({ ...prev, [phase.id]: expenses }));
      setIncomes((prev) => ({ ...prev, [phase.id]: incomes }));
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPhases();
    }
  }, [user?.id]);

  // Save phase (create or update)
  const savePhase = async () => {
    if (!form.project_id || !form.name) {
      alert("Please fill in required fields");
      return;
    }

    if (form.end_date <= form.start_date) {
      alert("End date must be after start date");
      return;
    }

    const phaseData = {
      project_id: form.project_id,
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      contractor_name: form.contractor_name || null,
    };

    if (editingPhase) {
      await supabase.from("phases").update(phaseData).eq("id", editingPhase.id);
    } else {
      await supabase.from("phases").insert([phaseData]);
    }

    setShowModal(false);
    setEditingPhase(null);
    setForm({
      project_id: "",
      name: "",
      start_date: "",
      end_date: "",
      status: "Not Started",
      estimated_cost: "",
      contractor_name: "",
    });
    fetchPhases();
  };

  const deletePhase = async (phase: Phase) => {
    try {
      console.log("Attempting to delete phase:", phase.id);
      
      // Delete the phase - related data should cascade automatically
      const { error } = await supabase
        .from("phases")
        .delete()
        .eq("id", phase.id);

      if (error) {
        console.error("Supabase delete error:", error);
        alert(`Failed to delete phase: ${error.message}`);
        return;
      }

      console.log("Phase deleted successfully from database");
      
      // Refresh phases from database to ensure sync
      await fetchPhases();
      
      // Clear selected phase if it was deleted
      if (selectedPhase?.id === phase.id) {
        setSelectedPhase(null);
      }
      
      // Close view modal if the deleted phase was being viewed
      if (viewPhase?.id === phase.id) {
        setViewPhase(null);
      }

      setShowDeleteConfirm(false);
      setPhaseToDelete(null);
      alert("Phase deleted successfully!");
      
    } catch (error) {
      console.error("Error deleting phase:", error);
      alert(`An error occurred while deleting the phase: ${error.message}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, phase: Phase) => {
    e.stopPropagation();
    setPhaseToDelete(phase);
    setShowDeleteConfirm(true);
  };

  const editPhase = (phase: Phase) => {
    setEditingPhase(phase);
    setForm({
      project_id: phase.project_id,
      name: phase.name,
      start_date: phase.start_date,
      end_date: phase.end_date,
      status: phase.status,
      estimated_cost: phase.estimated_cost?.toString() || "",
      contractor_name: phase.contractor_name || "",
    });
    setShowModal(true);
  };

  const getBudgetUsage = (phase: Phase) => {
    const totalSpent = expenses[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalIncome = incomes[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const netExpense = totalSpent - totalIncome;
    if (!phase.estimated_cost) return 0;
    return Math.round((netExpense / phase.estimated_cost) * 100);
  };

  // Fetch phase photos
  const fetchPhasePhotos = async (phaseId: string) => {
    const { data, error } = await supabase
      .from("phase_photos")
      .select("id, photo_url, created_at, uploaded_by")
      .eq("phase_id", phaseId)
      .order("created_at", { ascending: false });
    if (!error) setPhasePhotos(data || []);
  };

  // Fetch comments
  const fetchComments = async (phaseId: string) => {
    const { data, error } = await supabase
      .from("phase_comments")
      .select(`id, comment, created_at, updated_at, user_id, profiles!user_id(id, full_name)`)
      .eq("phase_id", phaseId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(
        data.map((c: any) => ({
          id: c.id,
          phase_id: phaseId,
          user_id: c.user_id,
          user_name: c.profiles?.full_name || "Unknown",
          comment: c.comment,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }))
      );
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user || !viewPhase) return;
    await supabase.from("phase_comments").insert([
      { phase_id: viewPhase.id, user_id: user.id, comment: newComment.trim() },
    ]);
    setNewComment("");
    fetchComments(viewPhase.id);
  };

  const updateComment = async (id: string, text: string) => {
    await supabase.from("phase_comments").update({ comment: text }).eq("id", id);
    if (viewPhase) fetchComments(viewPhase.id);
  };

  const removeComment = async (id: string) => {
    await supabase.from("phase_comments").delete().eq("id", id);
    if (viewPhase) fetchComments(viewPhase.id);
  };

  // Get the header subtitle based on selected phase
  const getHeaderSubtitle = () => {
    if (selectedPhase) {
      return `${selectedPhase.name} - ${selectedPhase.project_name}`;
    }
    return undefined;
  };

  // Close modal when clicking outside
  const handleModalClick = (e: React.MouseEvent, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter phases based on search term
  const filteredPhases = phases.filter((phase) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      phase.name.toLowerCase().includes(searchLower) ||
      phase.project_name?.toLowerCase().includes(searchLower) ||
      phase.status.toLowerCase().includes(searchLower) ||
      phase.contractor_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Layout title="Phases" subtitle={getHeaderSubtitle()}>
      <div className="p-6">
        <div className="mb-6 flex gap-4 items-center">
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-1" /> Create Phase
            </button>
          )}

          {/* Search Bar */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search phases"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-half pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Phase List */}
        <div className="space-y-4">
          {filteredPhases.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              No phases found matching "{searchTerm}"
            </div>
          )}
          {filteredPhases.map((phase) => {
            const totalExpenses = expenses[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;
            const totalIncome = incomes[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;
            const netAmount = totalExpenses - totalIncome;

            return (
            <div
              key={phase.id}
              className={`border rounded-lg shadow-sm cursor-pointer transition-all ${
                selectedPhase?.id === phase.id
                  ? "border-blue-500 bg-blue-50"
                  : "hover:border-gray-300 hover:shadow-md"
              }`}
              onClick={() => setSelectedPhase(phase)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">{phase.name}</h2>
                    <p className="text-sm text-gray-500 mb-1">
                      Project: {phase.project_name}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {phase.start_date} → {phase.end_date}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(phase.status)}`}>
                        {phase.status}
                      </span>
                    </div>
                    {phase.contractor_name && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        Contractor: {phase.contractor_name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhase(phase);
                        setViewPhase(phase);
                        fetchPhasePhotos(phase.id);
                        fetchComments(phase.id);
                      }}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      View Details
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editPhase(phase);
                          }}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, phase)}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Budget</span>
                      <DollarSign className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      ₹{phase.estimated_cost?.toLocaleString() || '0'}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-700">Income</span>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-lg font-bold text-green-600 mt-1">
                      ₹{totalIncome.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {incomes[phase.id]?.length || 0} transactions
                    </p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-700">Expenses</span>
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-lg font-bold text-red-600 mt-1">
                      ₹{totalExpenses.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {expenses[phase.id]?.length || 0} transactions
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">Net Amount</span>
                      <DollarSign className="w-4 h-4 text-gray-600" />
                    </div>
                    <p className={`text-lg font-bold mt-1 {netAmount <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netAmount <= 0 ? '+' : '-'}₹{Math.abs(netAmount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {netAmount <= 0 ? 'Surplus' : 'Deficit'}
                    </p>
                  </div>
                </div>

                {/* Budget Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-600">Budget Usage</span>
                    <span className={`text-xs font-semibold {getBudgetUsage(phase) > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                      {getBudgetUsage(phase)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        getBudgetUsage(phase) > 100 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(getBudgetUsage(phase), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => handleModalClick(e, () => setShowModal(false))}
          >
            <div className="bg-white p-6 rounded-lg w-full max-w-md z-50">
              <h2 className="text-xl font-semibold mb-4">
                {editingPhase ? "Edit Phase" : "Create New Phase"}
              </h2>

              <label className="block text-sm mb-1 font-medium">Project</label>
              <select
                className="border p-2 rounded w-full mb-3"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Phase Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <label className="block text-sm mb-1 font-medium">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <label className="block text-sm mb-1 font-medium">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Phase["status"] })
                }
                className="border p-2 rounded w-full mb-3"
              >
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>

              <input
                type="number"
                placeholder="Estimated Cost (₹)"
                value={form.estimated_cost}
                onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <input
                type="text"
                placeholder="Contractor Name"
                value={form.contractor_name}
                onChange={(e) => setForm({ ...form, contractor_name: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={savePhase}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Save Phase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Phase Details Modal */}
        {viewPhase && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
            onClick={(e) => handleModalClick(e, () => setViewPhase(null))}
          >
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto z-40">
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Phase Details</h2>
                <button 
                  onClick={() => setViewPhase(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Phase Title and Project */}
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{viewPhase.name}</h1>
                  <div className="flex items-center justify-center text-gray-600 mb-4">
                    <File className="w-5 h-5 mr-2" />
                    <span>Project: {viewPhase.project_name}</span>
                  </div>
                </div>

                {/* Status, Dates, and Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-1">Status</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewPhase.status)}`}>
                      {viewPhase.status}
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-1">Start Date</h3>
                    <p className="text-gray-900 font-medium">
                      {viewPhase.start_date ? new Date(viewPhase.start_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-1">End Date</h3>
                    <p className="text-gray-900 font-medium">
                      {viewPhase.end_date ? new Date(viewPhase.end_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Budget Overview Section */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <IndianRupee className="w-6 h-6 text-blue-600 mr-2" />
                    <h3 className="text-xl font-bold text-gray-900">Budget Overview</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Total Budget</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{viewPhase.estimated_cost?.toLocaleString() || '0'}
                      </p>
                    </div>

                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Budget Used</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        ₹{Math.abs(
                          (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                          (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0)
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Remaining</h4>
                      <p className={`text-2xl font-bold ${
                        viewPhase.estimated_cost && 
                        (viewPhase.estimated_cost - 
                         ((expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                          (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0))) >= 0
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{viewPhase.estimated_cost ? 
                          (viewPhase.estimated_cost - 
                           ((expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                            (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0))
                          ).toLocaleString() : '0'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-gray-900">{getBudgetUsage(viewPhase)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          getBudgetUsage(viewPhase) > 100 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(getBudgetUsage(viewPhase), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Overview Section */}
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <IndianRupee className="w-6 h-6 text-green-600 mr-2" />
                    <h3 className="text-xl font-bold text-gray-900">Financial Overview</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg p-4 text-center border border-green-200">
                      <div className="flex items-center justify-center mb-2">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Total Income</h4>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{(incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {incomes[viewPhase.id]?.length || 0} transactions
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 text-center border border-red-200">
                      <div className="flex items-center justify-center mb-2">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Total Expenses</h4>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{(expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {expenses[viewPhase.id]?.length || 0} transactions
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                      <div className="flex items-center justify-center mb-2">
                        <IndianRupee className="w-6 h-6 text-gray-600" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Net Amount</h4>
                      <p className={`text-2xl font-bold ${
                        (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                        (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) >= 0 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                         (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) >= 0 ? '+' : '-'}
                        ₹{Math.abs(
                          (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                          (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0)
                        ).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                         (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) >= 0 ? 'Profit' : 'Loss'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                {viewPhase.contractor_name && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-600 mr-2" />
                      <span className="font-medium text-gray-700">Contractor:</span>
                      <span className="ml-2 text-gray-900">{viewPhase.contractor_name}</span>
                    </div>
                  </div>
                )}

                {/* Photos Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Camera className="w-6 h-6 text-gray-600 mr-2" />
                      <h3 className="text-xl font-bold text-gray-900">Phase Photos</h3>
                    </div>
                    {canManage && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          if (!e.target.files || !user) return;
                          const file = e.target.files[0];
                          const compressed = await imageCompression(file, { maxSizeMB: 1 });
                          const filePath = `phase-photos/${viewPhase.id}/${Date.now()}-${file.name}`;
                          const { error } = await supabase.storage
                            .from("phase-photos")
                            .upload(filePath, compressed);
                          if (error) return alert(error.message);
                          const { data } = supabase.storage.from("phase-photos").getPublicUrl(filePath);
                          await supabase.from("phase_photos").insert([
                            { phase_id: viewPhase.id, project_id: viewPhase.project_id, uploaded_by: user.id, photo_url: data.publicUrl }
                          ]);
                          fetchPhasePhotos(viewPhase.id);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {phasePhotos.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setFullScreenImage(p.photo_url)}
                      >
                        <img
                          src={p.photo_url}
                          alt="Phase"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                  {phasePhotos.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No photos uploaded yet</p>
                  )}
                </div>

                {/* Comments Section */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Comments</h3>
                  <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <User className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="font-medium text-gray-900">{c.user_name}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(c.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={c.comment}
                              onChange={(e) => updateComment(c.id, e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-gray-700 focus:outline-none focus:ring-0"
                              readOnly={user?.id !== c.user_id}
                            />
                          </div>
                          {user?.id === c.user_id && (
                            <button
                              onClick={() => removeComment(c.id)}
                              className="text-red-600 hover:text-red-700 ml-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={addComment}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {canManage && (
                  <div className="flex gap-3 pt-6 border-t">
                    <button
                      onClick={() => editPhase(viewPhase)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Phase
                    </button>
                    <button
                      onClick={() => handleDeleteClick({} as React.MouseEvent, viewPhase)}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Phase
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && phaseToDelete && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => handleModalClick(e, () => {
              setShowDeleteConfirm(false);
              setPhaseToDelete(null);
            })}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Delete Phase</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the phase "{phaseToDelete.name}"? 
                  This action will also delete all associated expenses, photos, and comments. 
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPhaseToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deletePhase(phaseToDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Phase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Image */}
        {fullScreenImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
            onClick={() => setFullScreenImage(null)}
          >
            <img
              src={fullScreenImage}
              alt="fullscreen phase"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    </Layout>
  );
}