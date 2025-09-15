import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
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

  const canManage = ["Admin", "Project Manager", "Site Engineer"].includes(
    userRole ?? ""
  );

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (!error) setProjects(data || []);
    };
    fetchProjects();
  }, []);

  // Fetch phases and their expenses
  const fetchPhases = async () => {
    const { data, error } = await supabase
      .from("phases")
      .select(
        `id, project_id, name, start_date, end_date, status, estimated_cost, contractor_name, projects!inner(name)`
      )
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
      const { data: exp } = await supabase
        .from("expenses")
        .select("*")
        .eq("phase_id", phase.id);
      setExpenses((prev) => ({ ...prev, [phase.id]: exp || [] }));
    }
  };

  useEffect(() => {
    fetchPhases();
  }, []);

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
    if (!phase.estimated_cost) return 0;
    return Math.round((totalSpent / phase.estimated_cost) * 100);
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

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Phases</h1>

        {canManage && (
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white p-2 rounded"
            >
              <Plus className="w-5 h-5 inline-block mr-1" /> Create Phase
            </button>
          </div>
        )}

        {/* Phase List */}
        <div className="space-y-4">
          {phases.map((phase) => (
            <div
              key={phase.id}
              className="border rounded-lg p-4 shadow-sm flex justify-between items-center"
            >
              <div>
                <h2 className="text-lg font-semibold">{phase.name}</h2>
                <p className="text-sm text-gray-600">
                  {phase.start_date} → {phase.end_date} | {phase.status}
                </p>
                <p className="text-sm text-gray-600">
                  {getBudgetUsage(phase)}% budget used
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewPhase(phase);
                    fetchPhasePhotos(phase.id);
                    fetchComments(phase.id);
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  View Phase Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md z-50">
              <h2 className="text-xl font-semibold mb-4">
                {editingPhase ? "Edit Phase" : "Create New Phase"}
              </h2>

              <label className="block text-sm mb-1">Project</label>
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

              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl overflow-y-auto max-h-[90vh] z-40">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{viewPhase.name}</h2>
                <button onClick={() => setViewPhase(null)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p>
                <strong>Project:</strong> {viewPhase.project_name}
              </p>
              <p>
                <strong>Start Date:</strong> {viewPhase.start_date}
              </p>
              <p>
                <strong>End Date:</strong> {viewPhase.end_date}
              </p>
              <p>
                <strong>Status:</strong> {viewPhase.status}
              </p>
              <p>
                <strong>Estimated Cost:</strong> ₹
                {viewPhase.estimated_cost?.toLocaleString()}
              </p>
              <p>
                <strong>Contractor:</strong> {viewPhase.contractor_name}
              </p>

              <div className="my-3">
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-green-600 h-2 rounded"
                    style={{ width: `${getBudgetUsage(viewPhase)}%` }}
                  />
                </div>
                <p>{getBudgetUsage(viewPhase)}% of budget used</p>
              </div>

              {/* Expenses */}
              <h3 className="font-semibold mt-4">Expenses</h3>
              <table className="w-full border mt-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Amount</th>
                    <th className="p-2 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses[viewPhase.id]?.map((e) => (
                    <tr key={e.id}>
                      <td className="p-2 border">{e.category}</td>
                      <td className="p-2 border">₹{e.amount.toLocaleString()}</td>
                      <td className="p-2 border">{e.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Photos */}
              <h3 className="font-semibold mt-6">Phase Photos</h3>
              {canManage && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="file"
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
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {phasePhotos.map((p) => (
                  <div
                    key={p.id}
                    className="rounded shadow p-2 bg-white cursor-pointer"
                    onClick={() => setFullScreenImage(p.photo_url)}
                  >
                    <img
                      src={p.photo_url}
                      alt="Phase"
                      className="w-full h-40 object-cover rounded"
                    />
                  </div>
                ))}
              </div>

              {/* Comments */}
              <h3 className="font-semibold mt-6">Comments</h3>
              <div className="space-y-2 mt-2">
                {comments.map((c) => (
                  <div key={c.id} className="border p-2 rounded flex justify-between items-center">
                    <div>
                      <strong>{c.user_name}:</strong>{" "}
                      <input
                        type="text"
                        value={c.comment}
                        onChange={(e) => updateComment(c.id, e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </div>
                    {user?.id === c.user_id && (
                      <button
                        onClick={() => removeComment(c.id)}
                        className="text-red-600 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {canManage && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Add comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="border p-2 rounded w-full"
                    />
                    <button
                      onClick={addComment}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Edit & Delete Phase buttons */}
              {canManage && (
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => editPhase(viewPhase)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Edit Phase
                  </button>
                  
                </div>
              )}
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
