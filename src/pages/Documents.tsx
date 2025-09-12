// src/pages/Documents.tsx
import React, { useEffect, useState } from "react";
import { Search, Download, Eye, Upload } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext"; // ✅ for user + role
import imageCompression from "browser-image-compression"; // ✅ compression lib

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
  const { user, userRole } = useAuth(); // ✅ get logged in user + role
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
    fetchUsers();
  }, [userRole, user?.id]);

  // ✅ Fetch docs: admin sees all, others see only their own
  async function fetchDocuments() {
    let query = supabase
      .from("documents")
      .select("*")
      .order("upload_date", { ascending: false });

    if (userRole !== "Admin") {
      query = query.eq("uploaded_by", user?.id);
    }

    const { data, error } = await query;
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

  // ✅ Upload with compression
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
      // ✅ Compress image if it's an image type
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

  return (
    <Layout>
      <div className="p-4">
        {/* Header + Search */}
        <div className="flex justify-between mb-4">
          <h1 className="text-xl font-bold">Documents</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              className="border px-2 py-1 rounded"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="cursor-pointer" />
          </div>
        </div>

        {/* Upload Button */}
        <div className="mb-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-1"
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            <Upload size={16} /> {showUploadForm ? "Cancel" : "Upload"}
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="mb-6 flex flex-col gap-2 border p-4 rounded bg-gray-50">
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <select
              className="border px-2 py-1 rounded"
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
            <select
              className="border px-2 py-1 rounded"
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
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={handleUpload}
            >
              Confirm Upload
            </button>
          </div>
        )}

        {/* Documents Table */}
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Project</th>
              <th className="p-2 border">Uploaded By</th>
              <th className="p-2 border">Upload Date</th>
              <th className="p-2 border">Size</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents
              .filter((doc) =>
                doc.name?.toLowerCase().includes(search.toLowerCase())
              )
              .map((doc) => (
                <tr key={doc.id}>
                  <td className="p-2 border">{doc.name}</td>
                  <td className="p-2 border">{doc.category}</td>
                  <td className="p-2 border">{doc.project}</td>
                  <td className="p-2 border">{getUserName(doc.uploaded_by)}</td>
                  <td className="p-2 border">
                    {doc.upload_date
                      ? new Date(doc.upload_date).toLocaleDateString()
                      : ""}
                  </td>
                  <td className="p-2 border">{doc.size}</td>
                  <td className="p-2 border flex gap-2">
                    <Eye
                      className="cursor-pointer"
                      onClick={() =>
                        window.open(
                          supabase.storage
                            .from("project-docs")
                            .getPublicUrl(doc.file_path || "").data.publicUrl,
                          "_blank"
                        )
                      }
                    />
                    <Download
                      className="cursor-pointer"
                      onClick={() =>
                        handleDownload(doc.file_path || "", doc.name || "")
                      }
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
