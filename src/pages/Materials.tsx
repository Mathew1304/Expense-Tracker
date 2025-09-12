import React, { useState, useEffect } from "react";
import { Plus, Search, X, Trash } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Material = {
  id: string;
  name: string;
  qty_required: number;
  unit_cost: number;
  project_id: string;
  project_name?: string;
  status?: string;
  last_updated?: string;
  created_by?: string;
};

type Project = {
  id: string;
  name: string;
};

export function Materials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Material | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    qty_required: "",
    unit_cost: "",
    project_id: "",
    status: "In Stock",
  });

  const itemsPerPage = 5;

  useEffect(() => {
    fetchMaterials();
    fetchProjects();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("materials")
      .select(
        `
        id,
        name,
        qty_required,
        unit_cost,
        project_id,
        projects ( name ),
        status,
        updated_at,
        created_by
      `
      )
      .eq("created_by", user?.id); // only fetch materials created by logged in admin

    if (error) {
      console.error("Fetch error:", error);
      setError(error.message);
    } else {
      const mapped = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        qty_required: m.qty_required,
        unit_cost: m.unit_cost,
        project_id: m.project_id,
        project_name: m.projects?.name || "Unknown",
        status: m.status || "In Stock",
        last_updated: m.updated_at
          ? new Date(m.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : "N/A",
        created_by: m.created_by,
      }));
      setMaterials(mapped);
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase.from("projects").select("id, name");

    if (error) {
      console.error("Fetch projects error:", error);
    } else if (data) {
      setProjects(data);
    }
  };

  const handleAddMaterial = async () => {
    console.log("Attempting to add material:", newMaterial);
    if (
      !newMaterial.name.trim() ||
      !newMaterial.qty_required ||
      !newMaterial.unit_cost ||
      !newMaterial.project_id
    ) {
      alert("Please fill all fields");
      return;
    }

    const materialData = {
      name: newMaterial.name.trim(),
      qty_required: Number(newMaterial.qty_required),
      unit_cost: Number(newMaterial.unit_cost),
      project_id: newMaterial.project_id,
      status: newMaterial.status,
      created_by: user?.id, // attach logged in admin
    };

    console.log("Inserting material data:", materialData);
    const { error } = await supabase.from("materials").insert([materialData]);

    if (error) {
      console.error("Insert error:", error);
      alert("Error adding material: " + error.message);
    } else {
      console.log("Material added successfully");
      setShowModal(false);
      setNewMaterial({
        name: "",
        qty_required: "",
        unit_cost: "",
        project_id: "",
        status: "In Stock",
      });
      fetchMaterials();
    }
  };

  const handleUpdateMaterial = async (id: string) => {
    if (editValues) {
      const { error } = await supabase
        .from("materials")
        .update({
          name: editValues.name,
          qty_required: Number(editValues.qty_required),
          unit_cost: Number(editValues.unit_cost),
          project_id: editValues.project_id,
          status: editValues.status,
        })
        .eq("id", id)
        .eq("created_by", user?.id); // only allow updating own materials

      if (error) {
        alert("Error updating material: " + error.message);
      } else {
        setEditingId(null);
        setEditValues(null);
        fetchMaterials();
      }
    }
  };

  const handleDeleteMaterials = async () => {
    const { error } = await supabase
      .from("materials")
      .delete()
      .in("id", selectedMaterials)
      .eq("created_by", user?.id); // only allow deleting own materials

    if (error) {
      alert("Error deleting materials: " + error.message);
    } else {
      setSelectedMaterials([]);
      fetchMaterials();
    }
  };

  const filteredMaterials = materials.filter(
    (material) =>
      (!selectedProject || material.project_id === selectedProject) &&
      (material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(material.qty_required).includes(searchTerm) ||
        String(material.unit_cost).includes(searchTerm))
  );

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key as keyof Material] < b[key as keyof Material]) {
      return direction === "ascending" ? -1 : 1;
    }
    if (a[key as keyof Material] > b[key as keyof Material]) {
      return direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMaterials = sortedMaterials.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key && prev.direction === "ascending"
        ? { key, direction: "descending" }
        : { key, direction: "ascending" }
    );
  };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Materials</h1>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Material
            </button>
            {selectedMaterials.length > 0 && (
              <button
                onClick={handleDeleteMaterials}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg shadow-sm text-sm font-medium bg-white text-red-600 hover:bg-red-50"
              >
                <Trash className="h-4 w-4 mr-2" /> Delete Selected
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials, qty, or cost"
              className="pl-10 pr-4 py-2 border rounded-lg w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            className="border rounded-lg px-3 py-2"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading materials...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : currentMaterials.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No materials found</div>
          ) : (
            <div className="relative">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={selectedMaterials.length === materials.length}
                        onChange={(e) =>
                          setSelectedMaterials(
                            e.target.checked ? materials.map((m) => m.id) : []
                          )
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      Name{" "}
                      {sortConfig?.key === "name" &&
                        (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("qty_required")}
                    >
                      Qty Required{" "}
                      {sortConfig?.key === "qty_required" &&
                        (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("unit_cost")}
                    >
                      Unit Cost{" "}
                      {sortConfig?.key === "unit_cost" &&
                        (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("project_name")}
                    >
                      Project{" "}
                      {sortConfig?.key === "project_name" &&
                        (sortConfig.direction === "ascending" ? "↑" : "↓")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentMaterials.map((material) => {
                    const isHighCost =
                      materials.some(
                        (m) => m.id === material.id && m.qty_required * m.unit_cost > 10000
                      );
                    const isLowStock =
                      materials.some(
                        (m) =>
                          m.id === material.id &&
                          m.qty_required < 10 &&
                          m.status === "In Stock"
                      );

                    return (
                      <tr
                        key={material.id}
                        className={`${isHighCost ? "bg-red-50" : ""} ${
                          isLowStock ? "bg-yellow-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedMaterials.includes(material.id)}
                            onChange={(e) =>
                              setSelectedMaterials((prev) =>
                                e.target.checked
                                  ? [...prev, material.id]
                                  : prev.filter((id) => id !== material.id)
                              )
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {editingId === material.id ? (
                            <input
                              type="text"
                              value={editValues?.name || ""}
                              onChange={(e) =>
                                setEditValues({ ...editValues!, name: e.target.value } as Material)
                              }
                              className="border rounded-lg px-2 py-1 w-full"
                            />
                          ) : (
                            material.name
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {editingId === material.id ? (
                            <input
                              type="number"
                              value={editValues?.qty_required || ""}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues!,
                                  qty_required: Number(e.target.value),
                                } as Material)
                              }
                              className="border rounded-lg px-2 py-1 w-full"
                            />
                          ) : (
                            material.qty_required
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {editingId === material.id ? (
                            <input
                              type="number"
                              value={editValues?.unit_cost || ""}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues!,
                                  unit_cost: Number(e.target.value),
                                } as Material)
                              }
                              className="border rounded-lg px-2 py-1 w-full"
                            />
                          ) : (
                            `₹${material.unit_cost}`
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {material.project_name} (Used for {material.project_name})
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {editingId === material.id ? (
                            <select
                              value={editValues?.status || ""}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues!,
                                  status: e.target.value,
                                } as Material)
                              }
                              className="border rounded-lg px-2 py-1 w-full"
                            >
                              <option value="In Stock">In Stock</option>
                              <option value="Ordered">Ordered</option>
                              <option value="Out of Stock">Out of Stock</option>
                            </select>
                          ) : (
                            material.status
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {material.last_updated}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {editingId === material.id ? (
                            <button
                              onClick={() => handleUpdateMaterial(material.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded-lg"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(material.id);
                                setEditValues({ ...material });
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded-lg"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="px-6 py-3 bg-gray-50 flex justify-between">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Material Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add Material</h2>
                <button onClick={() => setShowModal(false)}>
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Material Name"
                  className="border rounded-lg w-full px-3 py-2"
                  value={newMaterial.name}
                  onChange={(e) =>
                    setNewMaterial({ ...newMaterial, name: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Quantity Required"
                  className="border rounded-lg w-full px-3 py-2"
                  value={newMaterial.qty_required}
                  onChange={(e) =>
                    setNewMaterial({
                      ...newMaterial,
                      qty_required: e.target.value,
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Unit Cost"
                  className="border rounded-lg w-full px-3 py-2"
                  value={newMaterial.unit_cost}
                  onChange={(e) =>
                    setNewMaterial({
                      ...newMaterial,
                      unit_cost: e.target.value,
                    })
                  }
                />
                <select
                  className="border rounded-lg w-full px-3 py-2"
                  value={newMaterial.project_id}
                  onChange={(e) =>
                    setNewMaterial({
                      ...newMaterial,
                      project_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  className="border rounded-lg w-full px-3 py-2"
                  value={newMaterial.status}
                  onChange={(e) =>
                    setNewMaterial({
                      ...newMaterial,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  onClick={handleAddMaterial}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
