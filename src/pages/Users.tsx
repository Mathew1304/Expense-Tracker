import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { sendUserCredentialsEmail } from "../lib/emailService";
import { Layout } from "../components/Layout/Layout";
import { Users as UsersIcon, Plus, Search, Mail, Phone, Shield, MoveVertical as MoreVertical, ListFilter as Filter, CreditCard as Edit2, Trash2, Eye, Grid2x2 as Grid, List, Building, Calendar, Clock, X, Check, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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
  created_at?: string;
  phone?: string;
  department?: string;
  status?: string;
  lastLogin?: string;
  joinDate?: string;
};

type Role = {
  id: string;
  role_name: string;
  permissions?: string[];
};

type Project = {
  id: string;
  name: string;
};

type Notification = {
  id: string;
  type: 'success' | 'error';
  message: string;
};

export function Users() {
  const { profile, permissions } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewType, setViewType] = useState<'grid' | 'list'>('list');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role_id: "",
    project_id: "",
    department: "",
    status: "Active",
  });

  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role_id: "",
    department: "",
    status: "",
  });

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // Check permissions
  const canAddUser = permissions.includes('add_user');
  const canEditUser = permissions.includes('edit_user');
  const canDeleteUser = permissions.includes('delete_user');

  // Fetch users + roles + projects filtered by current admin
  useEffect(() => {
    fetchData();
  }, []);

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
      .select("id, name, email, phone, role_id, project_id, roles(role_name), projects(name), created_by, created_at")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (usersError) {
      console.error("Error fetching users:", usersError.message);
    } else if (usersData) {
      // Transform data to match UI expectations
      const transformedUsers = usersData.map(u => ({
        ...u,
        phone: u.phone || '',
        department: u.roles?.role_name || 'No Department',
        status: 'Active', // Default status
        lastLogin: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        joinDate: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
      setUsers(transformedUsers as User[]);
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

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.roles?.role_name === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

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

  // Confirm and add user
  async function confirmAddUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No logged-in admin found");
      showNotification('error', 'No logged-in admin found');
      return;
    }

    setSendingEmail(true);

    try {
      // 1. Insert user into database first
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            role_id: formData.role_id || null,
            project_id: formData.project_id || null,
            created_by: user.id,
          },
        ])
        .select("id, name, email, phone, role_id, project_id, roles(role_name), projects(name), created_by, created_at")
        .single();

      if (insertError) {
        console.error("Insert failed:", insertError.message);
        showNotification('error', `Failed to add user: ${insertError.message}`);
        setSendingEmail(false);
        return;
      }

      // 2. Send welcome email
      const emailParams = {
        to_email: formData.email,
        to_name: formData.name,
        password: generatedPassword,
        role: roles.find(r => r.id === formData.role_id)?.role_name || 'User',
        project: projects.find(p => p.id === formData.project_id)?.name,
      };

      const result = await sendUserCredentialsEmail(emailParams);

      if (result.success) {
        showNotification('success', 'User created and welcome email sent successfully!');
      } else {
        console.error('Email failed:', result.error);
        showNotification('error', `User created but email failed: ${result.error}. Credentials - Email: ${emailParams.to_email}, Password: ${generatedPassword}`);
      }

      // 3. Transform new user data and update UI
      const transformedUser = {
        ...newUser,
        phone: newUser.phone || '',
        department: newUser.roles?.role_name || 'No Department',
        status: 'Active',
        lastLogin: newUser.created_at ? new Date(newUser.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        joinDate: newUser.created_at ? new Date(newUser.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };

      setUsers((prev) => [transformedUser, ...prev]);
      
      // Reset form
      setShowConfirmModal(false);
      setFormData({ name: "", email: "", phone: "", role_id: "", project_id: "", department: "", status: "Active" });
      setGeneratedPassword("");

    } catch (error) {
      console.error('Error creating user:', error);
      showNotification('error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  }

  // Delete user
  async function handleDelete(userId: string) {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) {
        console.error("Delete failed:", error.message);
        showNotification('error', 'Failed to delete user');
        return;
      }
      setUsers(users.filter((u) => u.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
      showNotification('success', 'User deleted successfully');
    }
  }

  // Start editing
  function startEdit(user: User) {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role_id: user.role_id || "",
      department: user.department || '',
      status: user.status || 'Active',
    });
    setShowEditModal(true);
  }

  // Cancel editing
  function cancelEdit() {
    setEditingUser(null);
    setEditForm({ name: "", email: "", phone: "", role_id: "", department: "", status: "" });
    setShowEditModal(false);
  }

  // Save edits
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    const { data, error } = await supabase
      .from("users")
      .update({
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || null,
        role_id: editForm.role_id || null,
      })
      .eq("id", editingUser.id)
      .select("id, name, email, phone, role_id, project_id, roles(role_name), projects(name), created_by, created_at")
      .single();

    if (error) {
      console.error("Update failed:", error.message);
      showNotification('error', 'Failed to update user. Please try again.');
      return;
    }

    // Transform updated user data
    const transformedUser = {
      ...data,
      phone: data.phone || '',
      department: data.roles?.role_name || 'No Department',
      status: editForm.status || 'Active',
      lastLogin: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      joinDate: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    };

    setUsers(users.map((u) => (u.id === editingUser.id ? transformedUser : u)));
    showNotification('success', 'User updated successfully!');
    cancelEdit();
  }

  // View user
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Handle modal backdrop click
  const handleModalBackdropClick = (e: React.MouseEvent, closeFunction: () => void) => {
    if (e.target === e.currentTarget) {
      closeFunction();
    }
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Admin': 'bg-red-100 text-red-800',
      'Project Manager': 'bg-blue-100 text-blue-800',
      'Site Engineer': 'bg-green-100 text-green-800',
      'Accounts': 'bg-emerald-100 text-emerald-800',
      'Client': 'bg-orange-100 text-orange-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'Active').length;
  const inactiveUsers = users.filter(user => user.status === 'Inactive').length;

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
      {/* Success/Error Message Notifications - Fixed at top center */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] flex flex-col gap-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        ))}
      </div>

      <Layout title="Users" subtitle={getHeaderSubtitle()}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-slate-900">Users</h1>
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
                    <List className="w-4 h-4" />
                  </button>
                </div>
                {canAddUser && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add User</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <UsersIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Active Users</p>
                    <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Inactive Users</p>
                    <p className="text-2xl font-bold text-red-600">{inactiveUsers}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                    <UsersIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">All Roles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.role_name}>
                        {r.role_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Showing {filteredUsers.length} of {users.length} users</span>
            </div>

            {/* Users Display */}
            {viewType === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                          <p className="text-sm text-slate-600">{user.roles?.role_name || 'No Role'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status || 'Active')}`}>
                        {user.status || 'Active'}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone || 'Not Provided'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Building className="w-4 h-4" />
                        <span>{user.projects?.name || 'No Project'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>Joined: {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      {canEditUser && (
                        <button
                          onClick={() => startEdit(user)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDeleteUser && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Join Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={`cursor-pointer transition-all hover:bg-slate-50 ${
                            selectedUser?.id === user.id
                              ? "bg-blue-50 border-l-4 border-l-blue-500"
                              : ""
                          }`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{user.name}</p>
                                <div className="flex items-center space-x-2 text-sm text-slate-500">
                                  <Mail className="w-3 h-3" />
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.roles?.role_name || '')}`}>
                              {user.roles?.role_name || 'No Role'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {user.projects?.name || 'No Project'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status || 'Active')}`}>
                              {user.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewUser(user);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {canEditUser && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(user);
                                  }}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {canDeleteUser && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(user.id);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredUsers.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
                <p className="text-slate-600">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Add your first team member to get started.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </Layout>

      {/* Add User Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => handleModalBackdropClick(e, () => setShowForm(false))}
        >
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => handleModalBackdropClick(e, () => setShowConfirmModal(false))}
        >
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
                <p><strong>Phone:</strong> {formData.phone || 'Not provided'}</p>
                <p><strong>Role:</strong> {roles.find(r => r.id === formData.role_id)?.role_name}</p>
                <p><strong>Project:</strong> {projects.find(p => p.id === formData.project_id)?.name}</p>
                <p><strong>Status:</strong> {formData.status}</p>
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
                {sendingEmail ? 'Creating User...' : 'Add User & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => handleModalBackdropClick(e, () => {
            setShowViewModal(false);
            setSelectedUser(null);
          })}
        >
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Avatar and Basic Info */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedUser.name}</h3>
                  <p className="text-slate-600">{selectedUser.roles?.role_name || 'No Role'}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(selectedUser.status || 'Active')}`}>
                    {selectedUser.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-900">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="text-slate-900">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Phone</p>
                        <p className="text-slate-900">{selectedUser.phone || 'Not Provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-slate-900">Work Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Role</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.roles?.role_name || '')}`}>
                          {selectedUser.roles?.role_name || 'No Role'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Project</p>
                        <p className="text-slate-900">{selectedUser.projects?.name || 'No Project Assigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-500">Join Date</p>
                        <p className="text-slate-900">{selectedUser.joinDate ? new Date(selectedUser.joinDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    startEdit(selectedUser);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit User</span>
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleDelete(selectedUser.id);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => handleModalBackdropClick(e, cancelEdit)}
        >
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              <button
                onClick={cancelEdit}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
                <select
                  value={editForm.role_id}
                  onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}