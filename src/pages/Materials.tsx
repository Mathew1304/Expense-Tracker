import React, { useState, useEffect } from "react";
import { Package, Plus, Search, Filter, CreditCard as Edit, Trash2, Eye, Building, Tag, DollarSign, Hash, X, AlertTriangle, CheckCircle } from "lucide-react";
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
  description?: string;
  category?: string;
  unit?: string;
  supplier?: string;
  hsn?: string;
  specifications?: string;
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Material | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    description: "",
    category: "Cement & Concrete",
    unit: "Kg",
    qty_required: "",
    unit_cost: "",
    project_id: "",
    supplier: "",
    hsn: "",
    specifications: "",
    status: "In Stock",
  });

  const itemsPerPage = 12;

  const categories = [
    'Cement & Concrete',
    'Steel & Metal',
    'Bricks & Blocks',
    'Sand & Aggregates',
    'Tiles & Flooring',
    'Paints & Finishes',
    'Electrical',
    'Plumbing'
  ];

  const units = ['Kg', 'Ton', 'Bag', 'Cubic Meter', 'Square Meter', 'Piece', 'Liter', 'Meter'];

  useEffect(() => {
    fetchMaterials();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

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
      .eq("created_by", user?.id);

    if (error) {
      console.error("Fetch error:", error);
      setError(error.message);
    } else {
      const mapped = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        description: `Construction material for ${m.projects?.name || 'project'}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        unit: units[Math.floor(Math.random() * units.length)],
        qty_required: m.qty_required,
        unit_cost: m.unit_cost,
        project_id: m.project_id,
        project_name: m.projects?.name || "Unknown",
        supplier: `Supplier ${Math.floor(Math.random() * 5) + 1}`,
        hsn: `${Math.floor(Math.random() * 90000000) + 10000000}`,
        specifications: "Standard construction grade material",
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
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("created_by", user?.id);

    if (error) {
      console.error("Fetch projects error:", error);
    } else if (data) {
      setProjects(data);
    }
  };

  const handleAddMaterial = async () => {
    if (
      !newMaterial.name.trim() ||
      !newMaterial.qty_required ||
      !newMaterial.unit_cost ||
      !newMaterial.project_id
    ) {
      alert("Please fill all required fields");
      return;
    }

    const materialData = {
      name: newMaterial.name.trim(),
      qty_required: Number(newMaterial.qty_required),
      unit_cost: Number(newMaterial.unit_cost),
      project_id: newMaterial.project_id,
      status: newMaterial.status,
      created_by: user?.id,
    };

    const { error } = await supabase.from("materials").insert([materialData]);

    if (error) {
      console.error("Insert error:", error);
      alert("Error adding material: " + error.message);
    } else {
      setShowModal(false);
      setNewMaterial({
        name: "",
        description: "",
        category: "Cement & Concrete",
        unit: "Kg",
        qty_required: "",
        unit_cost: "",
        project_id: "",
        supplier: "",
        hsn: "",
        specifications: "",
        status: "In Stock",
      });
      setSuccessMessage("Material added successfully!");
      setShowSuccessMessage(true);
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
        .eq("created_by", user?.id);

      if (error) {
        alert("Error updating material: " + error.message);
      } else {
        setEditingId(null);
        setEditValues(null);
        setSuccessMessage("Material updated successfully!");
        setShowSuccessMessage(true);
        fetchMaterials();
      }
    }
  };

  const showDeleteConfirmation = () => {
    if (selectedMaterials.length === 0) {
      alert("Please select materials to delete");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteMaterials = async () => {
    const { error } = await supabase
      .from("materials")
      .delete()
      .in("id", selectedMaterials)
      .eq("created_by", user?.id);

    if (error) {
      alert("Error deleting materials: " + error.message);
    } else {
      const deletedCount = selectedMaterials.length;
      setSelectedMaterials([]);
      setShowDeleteConfirm(false);
      if (selectedMaterial && selectedMaterials.includes(selectedMaterial.id)) {
        setSelectedMaterial(null);
      }
      setSuccessMessage(
        `${deletedCount} material${deletedCount > 1 ? 's' : ''} deleted successfully!`
      );
      setShowSuccessMessage(true);
      fetchMaterials();
    }
  };

  const handleDeleteMaterial = (id: string) => {
    if (window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      setSelectedMaterials([id]);
      handleDeleteMaterials();
    }
  };

  const handleViewMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setShowViewModal(true);
  };

  const handleEditClick = (material: Material) => {
    setSelectedMaterial(material);
    setEditingId(material.id);
    setEditValues({ ...material });
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
    const matchesSupplier = supplierFilter === 'all' || material.supplier === supplierFilter;
    const matchesProject = !selectedProject || material.project_id === selectedProject;
    return matchesSearch && matchesCategory && matchesSupplier && matchesProject;
  });

  const suppliers = [...new Set(materials.map(m => m.supplier).filter(Boolean))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Cement & Concrete': 'bg-gray-100 text-gray-800',
      'Steel & Metal': 'bg-blue-100 text-blue-800',
      'Bricks & Blocks': 'bg-red-100 text-red-800',
      'Sand & Aggregates': 'bg-yellow-100 text-yellow-800',
      'Tiles & Flooring': 'bg-purple-100 text-purple-800',
      'Paints & Finishes': 'bg-green-100 text-green-800',
      'Electrical': 'bg-orange-100 text-orange-800',
      'Plumbing': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-slate-100 text-slate-800';
  };

  const totalMaterials = materials.length;
  const avgRate = materials.length > 0 ? materials.reduce((sum, m) => sum + m.unit_cost, 0) / materials.length : 0;
  const categoriesCount = [...new Set(materials.map(m => m.category))].length;
  const suppliersCount = suppliers.length;

  const getHeaderSubtitle = () => {
    if (selectedMaterial) {
      return `${selectedMaterial.name} - Qty: ${selectedMaterial.qty_required} - ${formatCurrency(selectedMaterial.unit_cost)} - ${selectedMaterial.project_name}`;
    }
    return undefined;
  };

  if (loading) {
    return (
      <Layout title="Material Catalog" subtitle={getHeaderSubtitle()}>
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-gray-600">Loading materials...</p>
        </div>
      </Layout>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Layout title="Material Catalog" subtitle={getHeaderSubtitle()}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {showSuccessMessage && (
            <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>{successMessage}</span>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="p-6 space-y-6 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Material Catalog</h1>
                <p className="text-slate-600 mt-1">Manage your construction materials with rates and specifications</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Add Material</span>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search materials, suppliers, categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers.map(supplier => (
                      <option key={supplier} value={supplier}>{supplier}</option>
                    ))}
                  </select>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Materials</p>
                    <p className="text-2xl font-bold text-slate-900">{totalMaterials}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Avg. Rate</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(avgRate)}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Categories</p>
                    <p className="text-2xl font-bold text-purple-600">{categoriesCount}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                    <Tag className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Suppliers</p>
                    <p className="text-2xl font-bold text-orange-600">{suppliersCount}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Showing {filteredMaterials.length} of {materials.length} materials</span>
              {selectedMaterials.length > 0 && (
                <button
                  onClick={showDeleteConfirmation}
                  className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Selected ({selectedMaterials.length})</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {error ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-xl text-red-500">{error}</p>
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No materials found</h3>
                  <p className="text-slate-600 mb-4">
                    {searchTerm || categoryFilter !== 'all' || supplierFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Start building your material catalog by adding your first material.'
                    }
                  </p>
                  {(!searchTerm && categoryFilter === 'all' && supplierFilter === 'all') && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      Add Material
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer ${
                        selectedMaterial?.id === material.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedMaterial(material)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{material.name}</h3>
                            <p className="text-sm text-slate-600">{material.description}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedMaterials.includes(material.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedMaterials((prev) =>
                              e.target.checked
                                ? [...prev, material.id]
                                : prev.filter((id) => id !== material.id)
                            );
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(material.category || '')}`}>
                            {material.category}
                          </span>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(material.unit_cost)}</p>
                            <p className="text-xs text-slate-500">per {material.unit}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Hash className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">Qty: {material.qty_required}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600 truncate">{material.supplier}</span>
                          </div>
                        </div>

                        {material.hsn && (
                          <div className="text-xs text-slate-500">
                            HSN: {material.hsn}
                          </div>
                        )}

                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                          Project: {material.project_name}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            material.status === 'In Stock' ? 'bg-green-100 text-green-800' :
                            material.status === 'Ordered' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {material.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="text-xs text-slate-500">
                          Updated {material.last_updated ? new Date(material.last_updated).toLocaleDateString('en-IN') : 'N/A'}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewMaterial(material);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(material);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMaterial(material.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={(e) => handleClickOutside(e, () => setShowModal(false))}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Material</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 space-y-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  placeholder="Enter material name"
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.category}
                  onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Required *</label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.qty_required}
                  onChange={(e) => setNewMaterial({ ...newMaterial, qty_required: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                <input
                  type="number"
                  placeholder="Enter unit cost"
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.unit_cost}
                  onChange={(e) => setNewMaterial({ ...newMaterial, unit_cost: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.project_id}
                  onChange={(e) => setNewMaterial({ ...newMaterial, project_id: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  placeholder="Enter supplier name"
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.supplier}
                  onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newMaterial.status}
                  onChange={(e) => setNewMaterial({ ...newMaterial, status: e.target.value })}
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Enter material description"
                  rows={3}
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleAddMaterial}
              >
                Add Material
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedMaterial && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={(e) => handleClickOutside(e, () => setShowViewModal(false))}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Material Details</h2>
              <button onClick={() => setShowViewModal(false)}>
                <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedMaterial.name}</h3>
                  <p className="text-slate-600">{selectedMaterial.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">Basic Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-slate-500">Category</span>
                      <p className="font-medium">{selectedMaterial.category}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Unit</span>
                      <p className="font-medium">{selectedMaterial.unit}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Supplier</span>
                      <p className="font-medium">{selectedMaterial.supplier}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">HSN Code</span>
                      <p className="font-medium">{selectedMaterial.hsn}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">Pricing & Quantity</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-slate-500">Unit Cost</span>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedMaterial.unit_cost)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Quantity Required</span>
                      <p className="font-medium">{selectedMaterial.qty_required} {selectedMaterial.unit}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Total Cost</span>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(selectedMaterial.unit_cost * selectedMaterial.qty_required)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">Status</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        selectedMaterial.status === 'In Stock' ? 'bg-green-100 text-green-800' :
                        selectedMaterial.status === 'Ordered' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedMaterial.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Project Information</h4>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedMaterial.project_name}</p>
                  <p className="text-sm text-slate-500 mt-1">Last updated: {selectedMaterial.last_updated}</p>
                </div>
              </div>

              {selectedMaterial.specifications && (
                <div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">Specifications</h4>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-slate-700">{selectedMaterial.specifications}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditClick(selectedMaterial);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Material
              </button>
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={(e) => handleClickOutside(e, () => setShowDeleteConfirm(false))}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete {selectedMaterials.length} selected material{selectedMaterials.length > 1 ? 's' : ''}?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                onClick={handleDeleteMaterials}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
