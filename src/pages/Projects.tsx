// src/pages/Projects.tsx
import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, X } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function Projects() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "pending",
    location: "",
    start_date: "",
    end_date: ""
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

  // ✅ Add or update project
  const handleSaveProject = async () => {
    if (!newProject.name) {
      alert("Please enter project name");
      return;
    }
    if (!profileId) {
      alert("Admin profile not found");
      return;
    }

    let error;
    if (editingProject) {
      ({ error } = await supabase
        .from("projects")
        .update({
          name: newProject.name,
          description: newProject.description || null,
          status: newProject.status || "pending",
          location: newProject.location || null,
          start_date: newProject.start_date || null,
          end_date: newProject.end_date || null
        })
        .eq("id", editingProject.id)
        .eq("created_by", profileId));
    } else {
      ({ error } = await supabase.from("projects").insert([
        {
          ...newProject,
          created_by: profileId
        }
      ]));
    }

    if (error) {
      console.error("Save project error:", error.message);
      alert("Failed to save project");
    } else {
      setIsModalOpen(false);
      setEditingProject(null);
      setNewProject({
        name: "",
        description: "",
        status: "pending",
        location: "",
        start_date: "",
        end_date: ""
      });
      fetchProjects();
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setNewProject({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "pending",
      location: project.location || "",
      start_date: project.start_date || "",
      end_date: project.end_date || ""
    });
    setIsModalOpen(true);
  };

  // ✅ Apply search + filter
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === "All" ? true : p.status === filterStatus;
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
                end_date: ""
              });
              setIsModalOpen(true);
            }}
            className="mt-2 sm:mt-0 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>

        {loading && <div className="text-center text-gray-500">Loading...</div>}

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
                  Start: {project.start_date || "-"} | End: {project.end_date || "-"}
                </p>
                <p className="text-sm text-gray-600">
                  Description: {project.description || "-"}
                </p>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => handleEditProject(project)}
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

      {/* ✅ Modal */}
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
    </Layout>
  );
}
