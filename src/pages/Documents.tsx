import React, { useEffect, useState } from "react";
import { Search, Download, Eye, Upload, X } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
    fetchUsers();
  }, [user?.id]);

  // Fetch only the logged-in admin's documents
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
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
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

  // Upload with compression
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
      // Compress image if it's an image type
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

  // Get the header subtitle based on selected document
  const getHeaderSubtitle = () => {
    if (selectedDocument) {
      return `${selectedDocument.name} - ${selectedDocument.category} - ${selectedDocument.project}`;
    }
    return undefined;
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name?.toLowerCase().includes(search.toLowerCase())
  );

  const currentDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  return (
    <div className="h-screen flex flex-col">
      <Layout title="Documents" subtitle={getHeaderSubtitle()}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            {/* Header + Search */}
            <div className="flex justify-between mb-4">
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <div className="mb-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                <Upload size={16} /> {showUploadForm ? "Cancel" : "Upload Document"}
              </button>
            </div>

            {/* Documents Table Container - Scrollable */}
            <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left">
                    <th className="p-3 font-medium text-gray-700 border-b">Name</th>
                    <th className="p-3 font-medium text-gray-700 border-b">Category</th>
                    <th className="p-3 font-medium text-gray-700 border-b">Project</th>
                    <th className="p-3 font-medium text-gray-700 border-b">Uploaded By</th>
                    <th className="p-3 font-medium text-gray-700 border-b">Upload Date</th>
                    <th className="p-3 font-medium text-gray-700 border-b">Size</th>
                    <th className="p-3 font-medium text-gray-700 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDocuments.map((doc) => (
                    <tr 
                      key={doc.id}
                      className={`cursor-pointer transition-all border-b hover:bg-gray-50 ${
                        selectedDocument?.id === doc.id 
                          ? "bg-blue-50 border-l-4 border-l-blue-500" 
                          : ""
                      }`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <td className="p-3 text-gray-900">{doc.name}</td>
                      <td className="p-3 text-gray-900">{doc.category}</td>
                      <td className="p-3 text-gray-900">{doc.project}</td>
                      <td className="p-3 text-gray-900">{getUserName(doc.uploaded_by)}</td>
                      <td className="p-3 text-gray-900">
                        {doc.upload_date
                          ? new Date(doc.upload_date).toLocaleDateString()
                          : ""}
                      </td>
                      <td className="p-3 text-gray-900">{doc.size}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                supabase.storage
                                  .from("project-docs")
                                  .getPublicUrl(doc.file_path || "").data.publicUrl,
                                "_blank"
                              );
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(doc.file_path || "", doc.name || "");
                            }}
                            className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {currentDocuments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No documents found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-center items-center gap-4 py-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </Layout>

      {/* Fixed Footer */}
      <footer className="">
        <div className="">
          
        </div>
      </footer>

      {/* Upload Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="border border-gray-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="border border-gray-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block font-medium text-gray-700 mb-1">Project</label>
                <select
                  className="border border-gray-300 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
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
    </div>
  );
}