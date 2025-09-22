import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/Layout/Layout";
import { Plus, Edit2, Trash2, X, Check, Mail, User, AlertCircle } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role_id: string | null;
  project_id?: string | null;
  roles?: {
    role_name: string;
  } | null;
  projects?: {
    name: string;
  } | null;
  created_by: string | null;
};

type Role = {
  id: string;
  role_name: string;
};

type Project = {
  id: string;
  name: string;
};

export function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role_id: "",
    project_id: "",
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role_id: "",
  });

  const [roleFilter, setRoleFilter] = useState<string>("");
  const [showEmailSetup, setShowEmailSetup] = useState(false);

  // Fetch users + roles + projects filtered by current admin
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No logged-in admin found");
        setLoading(false);
        return;
      }

      // Fetch only users created by this admin
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, role_id, project_id, roles(role_name), projects(name), created_by")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (usersError) {
        console.error("Error fetching users:", usersError.message);
      } else if (usersData) {
        setUsers(usersData as User[]);
      }

      // Fetch roles created by this admin only
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, role_name")
        .eq("created_by", user.id);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError.message);
      } else if (rolesData) {
        setRoles(rolesData as Role[]);
      }

      // Fetch projects created by this admin
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("created_by", user.id);

      if (projectsError) {
        console.error("Error fetching projects:", projectsError.message);
      } else if (projectsData) {
        setProjects(projectsData as Project[]);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle form submission - show confirmation modal
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const password = generatePassword();
    setGeneratedPassword(password);
    setShowForm(false);
    setShowConfirmModal(true);
  }

  // Send email with login credentials
  async function sendWelcomeEmail() {
    setSendingEmail(true);
    
    try {
      // Option 1: Use EmailJS (Client-side email service)
      await sendViaEmailJS();
      
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Fallback: Show email details in a modal for manual sending
      showEmailDetailsModal();
    }
    
    setSendingEmail(false);
  }

  // Option 1: EmailJS Implementation
  async function sendViaEmailJS() {
    // EmailJS configuration - UPDATE THESE WITH YOUR ACTUAL VALUES
    const serviceId = 'service_7lchh47';
    const templateId = 'template_e2y4ot5';
    const publicKey = 'ddLUU50I7-6-0oREj';
    
    // EmailJS expects specific parameter structure
    const templateParams = {
      to_email: formData.email, // Primary recipient field
      to_name: formData.name,
      to: formData.email, // Backup recipient field
      from_name: 'BuildMyHomes Team',
      from_email: 'noreply@buildmyhomes.in',
      reply_to: formData.email,
      password: generatedPassword,
      role: roles.find(r => r.id === formData.role_id)?.role_name || 'User',
      project: projects.find(p => p.id === formData.project_id)?.name || 'Not Assigned',
      login_url: window.location.origin + '/login',
      user_email: formData.email, // For template content
      message: `Welcome to BuildMyHomes! Your login details are: Email: ${formData.email}, Password: ${generatedPassword}`,
    };

    console.log('EmailJS Configuration:', { serviceId, templateId, publicKey: publicKey.substring(0, 5) + '...' });
    console.log('EmailJS Template Params:', templateParams);

    // Load EmailJS if not already loaded
    if (!window.emailjs) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      document.head.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
      window.emailjs.init(publicKey);
    }

    try {
      console.log('Sending email via EmailJS...');
      
      // Use sendForm method which is more reliable for recipient addresses
      const response = await window.emailjs.send(
        serviceId,
        templateId,
        templateParams,
        publicKey // Pass public key as 4th parameter
      );
      
      console.log('EmailJS Response:', response);
      if (response.status === 200) {
        alert('Welcome email sent successfully via EmailJS!');
      } else {
        throw new Error(`EmailJS failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('EmailJS Error:', error);
      
      // More detailed error logging
      if (error.status) {
        console.error('EmailJS Error Status:', error.status);
        console.error('EmailJS Error Text:', error.text);
      }
      
      throw error;
    }
  }

  // Fallback: Show email details for manual sending
  function showEmailDetailsModal() {
    const emailContent = `
Subject: Welcome to BuildMyHomes - Your Account is Ready!

Hello ${formData.name}!

Welcome to BuildMyHomes! Your account has been created successfully.

Login Details:
Email: ${formData.email}
Password: ${generatedPassword}
Role: ${roles.find(r => r.id === formData.role_id)?.role_name || 'User'}
Project: ${projects.find(p => p.id === formData.project_id)?.name || 'Not Assigned'}

Login URL: ${window.location.origin}/login

Please change your password after your first login for security.

Best regards,
BuildMyHomes Team
    `;

    // Copy to clipboard
    navigator.clipboard.writeText(emailContent).then(() => {
      alert(`Email content copied to clipboard! Please send this manually to ${formData.email}\n\nPassword: ${generatedPassword}`);
    }).catch(() => {
      alert(`Please send this email manually to ${formData.email}:\n\n${emailContent}`);
    });
  }
  // Confirm and add user
  async function confirmAddUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No logged-in admin found");
      return;
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          name: formData.name,
          email: formData.email,
          role_id: formData.role_id || null,
          project_id: formData.project_id || null,
          created_by: user.id,
        },
      ])
      .select("id, name, email, role_id, project_id, roles(role_name), projects(name), created_by")
      .single();

    if (insertError) {
      console.error("Insert failed:", insertError.message);
      alert("Failed to add user. Please try again.");
      return;
    }

    // Send welcome email
    await sendWelcomeEmail();

    setUsers((prev) => [newUser, ...prev]);
    setShowConfirmModal(false);
    setFormData({ name: "", email: "", role_id: "", project_id: "" });
    setGeneratedPassword("");
  }

  // Delete user
  async function handleDelete(userId: string) {
    if (window.confirm("Are you sure you want to delete this user?")) {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) {
        console.error("Delete failed:", error.message);
        return;
      }
      setUsers(users.filter((u) => u.id !== userId));
      // Clear selected user if it was deleted
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
    }
  }

  // Start editing
  function startEdit(user: User) {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role_id: user.role_id || "",
    });
  }

  // Cancel editing
  function cancelEdit() {
    setEditingUser(null);
    setEditForm({ name: "", email: "", role_id: "" });
  }

  // Save edits
  async function handleEditSubmit(userId: string) {
    const { data, error } = await supabase
      .from("users")
      .update({
        name: editForm.name,
        email: editForm.email,
        role_id: editForm.role_id || null,
      })
      .eq("id", userId)
      .select("id, name, email, role_id, project_id, roles(role_name), projects(name), created_by")
      .single();

    if (error) {
      console.error("Update failed:", error.message);
      return;
    }

    setUsers(users.map((u) => (u.id === userId ? data : u)));
    cancelEdit();
  }

  // Filter by role
  const filteredUsers = roleFilter
    ? users.filter((u) => u.roles?.role_name === roleFilter)
    : users;

  // Get the header subtitle based on selected user
  const getHeaderSubtitle = () => {
    if (selectedUser) {
      const roleName = selectedUser.roles?.role_name || 'No Role';
      const projectName = selectedUser.projects?.name || 'No Project';
      return `${selectedUser.name} - ${roleName} - ${projectName}`;
    }
    return undefined;
  };

  if (loading) {
    return (
      <Layout title="Users">
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-gray-600">Loading users...</p>
        </div>
      </Layout>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Layout title="Users" subtitle={getHeaderSubtitle()}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 flex-1 flex flex-col overflow-hidden">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.role_name}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
                
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={18} /> Add User
              </button>
            </div>

            {/* Table Container - Scrollable */}
            <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Name</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Email</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Role</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Project</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={`cursor-pointer transition-all border-b hover:bg-gray-50 ${
                        selectedUser?.id === u.id 
                          ? "bg-blue-50 border-l-4 border-l-blue-500" 
                          : ""
                      }`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="p-3 text-gray-900">
                        {editingUser?.id === u.id ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            className="border border-gray-300 rounded-lg px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          u.name
                        )}
                      </td>
                      <td className="p-3 text-gray-900">
                        {editingUser?.id === u.id ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({ ...editForm, email: e.target.value })
                            }
                            className="border border-gray-300 rounded-lg px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          u.email
                        )}
                      </td>
                      <td className="p-3 text-gray-900">
                        {editingUser?.id === u.id ? (
                          <select
                            value={editForm.role_id}
                            onChange={(e) =>
                              setEditForm({ ...editForm, role_id: e.target.value })
                            }
                            className="border border-gray-300 rounded-lg px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Select role</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.role_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          u.roles?.role_name || "No Role"
                        )}
                      </td>
                      <td className="p-3 text-gray-900">
                        {u.projects?.name || "No Project"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {editingUser?.id === u.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSubmit(u.id);
                                }}
                                className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                                title="Save"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEdit();
                                }}
                                className="text-gray-600 hover:text-gray-800 p-1 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(u);
                                }}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(u.id);
                                }}
                                className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Layout>

      {/* Fixed Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-4 ml-64">
        <div className="text-center text-gray-500 text-sm">
          © 2025 Buildmyhomes.in — All Rights Reserved
        </div>
      </footer>

      {/* Add User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
                <select
                  value={formData.role_id}
                  onChange={(e) =>
                    setFormData({ ...formData, role_id: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Project</label>
                <select
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Review Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Confirm User Details</h3>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">User Information:</h4>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Role:</strong> {roles.find(r => r.id === formData.role_id)?.role_name}</p>
                <p><strong>Project:</strong> {projects.find(p => p.id === formData.project_id)?.name}</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Generated Password:</h4>
                    <p className="text-blue-800 font-mono text-sm bg-white px-2 py-1 rounded border">
                      {generatedPassword}
                    </p>
                    <p className="text-blue-700 text-sm mt-2">
                      This password will be sent to the user's email address.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowForm(true);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Edit
              </button>
              <button
                onClick={confirmAddUser}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail size={16} />
                {sendingEmail ? 'Sending...' : 'Add User & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Setup Modal */}
      {showEmailSetup && (
        <EmailSetup onClose={() => setShowEmailSetup(false)} />
      )}
    </div>
  );
}