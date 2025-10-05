import React, { useEffect, useState } from "react";
import { Search, Download, Eye, Upload, X, Trash2, AlertTriangle, FileText, Filter, Folder, Grid2x2 as Grid, List as ListIcon } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import imageCompression from "browser-image-compression";

type DocRecord = {
  id: string;
  name: string;
  category?: string;
  project?: string;
  uploaded_by?: string;
  upload_date?: string;
  size?: string;
  version?: string;
  type?: string;
  status?: string;
  file_path?: string;
  tags?: string[];
};

type Project = {
  id: string;
  name: string;
};

type User = {
  id: string;
  full_name?: string;
  email?: string;
};

const constructionCategories = [
  "Site Plan",
  "Building Permit",
  "Structural Drawings",
  "Electrical Plans",
  "Plumbing Plans",
  "HVAC Plans",
  "Material Specifications",
  "Safety Certificates",
  "Inspection Reports",
  "Completion Certificate",
];

export function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocRecord | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('list');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
    fetchUsers();
  }, [user?.id]);

  async function fetchDocuments() {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("uploaded_by", user.id)
      .order("upload_date", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error.message);
    } else {
      setDocuments(data || []);
    }
  }

  async function fetchProjects() {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error.message);
    } else {
      setProjects(data || []);
    }
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (error) {
      console.error("Error fetching users:", error.message);
    } else {
      setUsers(data || []);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }
    if (!category || !project) {
      alert("Please select both a category and project");
      return;
    }

    const userId = user?.id;
    if (!userId) {
      alert("You must be logged in to upload documents");
      return;
    }

    try {
      let fileToUpload: File = selectedFile;
      if (selectedFile.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(selectedFile, options);
      }

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-docs")
        .upload(filePath, fileToUpload);

      if (uploadError) {
        console.error("Error uploading file:", uploadError.message);
        alert("Upload failed");
        return;
      }

      const { error: insertError } = await supabase.from("documents").insert([
        {
          name: fileToUpload.name,
          category,
          project,
          uploaded_by: userId,
          file_path: filePath,
          size: `${(fileToUpload.size / 1024).toFixed(2)} KB`,
          status: "pending",
        },
      ]);

      if (insertError) {
        console.error("Failed to save document metadata:", insertError.message);
        alert("Failed to save document metadata");
      } else {
        alert("Document uploaded successfully!");
        setSelectedFile(null);
        setCategory("");
        setProject("");
        setShowUploadForm(false);
        fetchDocuments();
      }
    } catch (err) {
      console.error("Compression/Upload error:", err);
      alert("Something went wrong during upload");
    }
  }

  async function handleDownload(filePath: string, fileName: string) {
    const { data, error } = await supabase.storage
      .from("project-docs")
      .download(filePath);

    if (error) {
      console.error("Error downloading file:", error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getUserName(userId?: string) {
    const user = users.find((u) => u.id === userId);
    return user?.full_name || user?.email || userId || "Unknown";
  }

  async function deleteDocument(document: DocRecord) {
    if (!user?.id) {
      alert("You must be logged in to delete documents");
      return;
    }

    try {
      console.log("Attempting to delete document:", document.id, document.name);

      if (document.file_path) {
        console.log("Deleting file from storage:", document.file_path);
        const { error: storageError } = await supabase.storage
          .from("project-docs")
          .remove([document.file_path]);

        if (storageError) {
          console.warn("Storage deletion failed (continuing anyway):", storageError.message);
        } else {
          console.log("File deleted from storage successfully");
        }
      }

      console.log("Deleting document record from database");
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id)
        .eq("uploaded_by", user.id);

      if (dbError) {
        console.error("Database delete error:", dbError);
        alert(`Failed to delete document: ${dbError.message}`);
        return;
      }

      console.log("Document deleted successfully from database");

      await fetchDocuments();

      if (selectedDocument?.id === document.id) {
        setSelectedDocument(null);
      }

      setShowDeleteConfirm(false);
      setDocumentToDelete(null);

      alert("Document deleted successfully!");

    } catch (error: any) {
      console.error("Error deleting document:", error);
      alert(`An error occurred while deleting the document: ${error.message}`);
    }
  }

  const getHeaderSubtitle = () => {
    if (selectedDocument) {
      return `${selectedDocument.name} - ${selectedDocument.category} - ${selectedDocument.project}`;
    }
    return undefined;
  };

  const getFileIcon = (type?: string) => {
    return <FileText className="w-5 h-5 text-white" />;
  };

  const getFileColor = (type?: string) => {
    const colors: Record<string, string> = {
      'PDF': 'from-red-500 to-red-600',
      'Excel': 'from-green-500 to-green-600',
      'Word': 'from-blue-500 to-blue-600',
      'Image': 'from-orange-500 to-orange-600'
    };
    return colors[type || ''] || 'from-slate-500 to-slate-600';
  };

  const categories = constructionCategories.map(cat => {
    const count = documents.filter(doc => doc.category === cat).length;
    return {
      name: cat,
      count,
      color: getFileColor(cat)
    };
  }).filter(cat => cat.count > 0);

  const totalStorageUsed = documents.reduce((sum, doc) => {
    const sizeInKB = parseFloat(doc.size?.replace(' KB', '') || '0');
    return sum + sizeInKB;
  }, 0);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name?.toLowerCase().includes(search.toLowerCase()) ||
                         doc.project?.toLowerCase().includes(search.toLowerCase()) ||
                         getUserName(doc.uploaded_by).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="h-screen flex flex-col">
      <Layout title="Document Archive" subtitle={getHeaderSubtitle()}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Document Archive</h1>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-1">
                <button
                  onClick={() => setViewType('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewType === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewType === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowUploadForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">All Categories</option>
                  {constructionCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setCategoryFilter(category.name)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-gradient-to-br ${category.color} rounded-lg`}>
                      <Folder className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{category.name}</h3>
                      <p className="text-sm text-slate-600">{category.count} documents</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Storage Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{(totalStorageUsed / 1024).toFixed(2)} MB</p>
                <p className="text-sm text-slate-600">Total Storage Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
                <p className="text-sm text-slate-600">Total Documents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{(1000 - totalStorageUsed / 1024).toFixed(2)} MB</p>
                <p className="text-sm text-slate-600">Available Space</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Storage Usage</span>
                <span className="font-medium text-slate-900">{((totalStorageUsed / 1024) / 1000 * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                  style={{width: `${Math.min((totalStorageUsed / 1024) / 1000 * 100, 100)}%`}}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Recent Documents</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Showing {filteredDocuments.length} of {documents.length} documents</span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className={`px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    selectedDocument?.id === document.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => setSelectedDocument(document)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-10 h-10 bg-gradient-to-br ${getFileColor(document.type)} rounded-lg flex items-center justify-center`}>
                        {getFileIcon(document.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-900">{document.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{document.category}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-600">{document.project}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">{document.size}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">by {getUserName(document.uploaded_by)}</span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {document.upload_date ? new Date(document.upload_date).toLocaleDateString() : 'Unknown date'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            supabase.storage
                              .from("project-docs")
                              .getPublicUrl(document.file_path || "").data.publicUrl,
                            "_blank"
                          );
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(document.file_path || "", document.name || "");
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocumentToDelete(document);
                          setShowDeleteConfirm(true);
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

            {filteredDocuments.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No documents found</h3>
                <p className="text-slate-600">
                  {search || categoryFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Upload your first document to get started.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </Layout>

     

      {showUploadForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="border border-slate-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  className="border border-slate-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {constructionCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Project</label>
                <select
                  className="border border-slate-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                >
                  <option value="">Select Project</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.name}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                  onClick={() => setShowUploadForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  onClick={handleUpload}
                >
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-slate-900">Delete Document</h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-500">
                Are you sure you want to delete the document "{documentToDelete.name}"?
                This will permanently remove the file from storage and cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDocumentToDelete(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDocument(documentToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
