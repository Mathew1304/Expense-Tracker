import React, { useEffect, useState } from "react";
import { Plus, CreditCard as Edit, Trash2, Eye, X } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function RoleManagement() {
  const [roles, setRoles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user } = useAuth();

  const ALL_PERMISSIONS = [
    // Dashboard permissions
    "view_dashboard",
    
    // Project permissions
    "view_projects",
    "add_project",
    "edit_project",
    "delete_project",
    
    // Phase permissions
    "view_phases",
    "add_phase",
    "edit_phase",
    "delete_phase",
    "update_progress",
    "upload_site_updates",
    
    // Expense permissions
    "view_expenses",
    "add_income",
    "add_expense",
    "edit_expense",
    "delete_expense",
    "bulk_upload_expenses",
    "create_payment_links",
    
    // Material permissions
    "view_materials",
    "add_material",
    "edit_material",
    "delete_material",
    
    // Report permissions
    "view_reports",
    "generate_reports",
    "export_reports",
    
    // Calendar permissions
    "view_calendar",
    "add_event",
    "edit_event",
    
    // Document permissions
    "view_documents",
    "upload_documents",
    "delete_documents",
    
    // User management permissions
    "view_users",
    "add_user",
    "edit_user",
    "delete_user",
    
    // Role management permissions
    "view_roles",
    "add_role",
    "edit_role",
    "delete_role",
    
    // Settings permissions
    "view_settings",
    "edit_settings",
  ];

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user && userRole) {
      fetchRoles();
    }
  }, [user, userRole]);

  async function fetchUserRole() {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id)
      .single();

    if (!error && data) {
      setUserRole(data.role);
    }
  }

  async function fetchRoles() {
    let query = supabase
      .from("roles")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (userRole === "Admin") {
      // Admin sees only their own roles
      query = query.eq("created_by", user?.id);
    }
    // Superadmin sees all roles

    const { data, error } = await query;
    if (error) console.error(error);
    else setRoles(data || []);
  }

  async function createRole() {
    if (!roleName.trim()) return;
    const { error } = await supabase.from("roles").insert([
      {
        role_name: roleName,
        permissions: permissions,
        is_active: true,
        created_by: user?.id,
        created_at: new Date(),
      },
    ]);
    if (error) console.error(error);
    else {
      setRoleName("");
      setPermissions([]);
      setShowModal(false);
      fetchRoles();
    }
  }

  async function updateRole() {
    if (!selectedRole) return;
    const { error } = await supabase
      .from("roles")
      .update({
        role_name: roleName,
        permissions: permissions,
      })
      .eq("id", selectedRole.id);
    if (error) console.error(error);
    else {
      setShowEditModal(false);
      setSelectedRole(null);
      setRoleName("");
      setPermissions([]);
      fetchRoles();
    }
  }

  async function deleteRole() {
    if (!roleToDelete) return;
    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", roleToDelete.id);
    if (error) console.error(error);
    else {
      setShowDeleteModal(false);
      setRoleToDelete(null);
      fetchRoles();
    }
  }

  function togglePermission(permission: string) {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  }

  // Get the header subtitle based on selected role
  const getHeaderSubtitle = () => {
    if (selectedRole) {
      const permissionCount = selectedRole.permissions?.length || 0;
      return `${selectedRole.role_name} - ${permissionCount} permissions`;
    }
    return undefined;
  };

  return (
    <div className="h-screen flex flex-col">
      <Layout title="Role Management" subtitle={getHeaderSubtitle()}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 flex-1 flex flex-col overflow-hidden">
            {/* Header Section */}
            <div className="flex justify-end items-center mb-6">
              <button
                onClick={() => {
                  setRoleName("");
                  setPermissions([]);
                  setShowModal(true);
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={18} /> Create New Role
              </button>
            </div>

            {/* Table Container - Scrollable */}
            <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Role Name</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Permissions</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Created On</th>
                    <th className="p-3 text-left font-medium text-gray-700 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr 
                      key={role.id} 
                      className={`cursor-pointer transition-all border-b hover:bg-gray-50 ${
                        selectedRole?.id === role.id 
                          ? "bg-blue-50 border-l-4 border-l-blue-500" 
                          : ""
                      }`}
                      onClick={() => setSelectedRole(role)}
                    >
                      <td className="p-3 text-gray-900 font-medium">{role.role_name}</td>
                      <td className="p-3 text-gray-600">
                        <div className="max-w-xs truncate">
                          {role.permissions?.join(", ") || "No permissions"}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">
                        {new Date(role.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-3">
                          {/* View */}
                          <button
                            className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRole(role);
                              setShowViewModal(true);
                            }}
                            title="View Role"
                          >
                            <Eye size={18} />
                          </button>
                          {/* Edit */}
                          <button
                            className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRole(role);
                              setRoleName(role.role_name);
                              setPermissions(role.permissions || []);
                              setShowEditModal(true);
                            }}
                            title="Edit Role"
                          >
                            <Edit size={18} />
                          </button>
                          {/* Delete */}
                          <button
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleToDelete(role);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Role"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {roles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No roles found.
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
      <footer className="">
        <div className="">
          
        </div>
      </footer>

      {/* Create Role Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create New Role</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 w-full mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="mb-4">
              <h3 className="font-medium mb-2 text-gray-700">Permissions</h3>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRole}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Role</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 w-full mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="mb-4">
              <h3 className="font-medium mb-2 text-gray-700">Permissions</h3>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateRole}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Role Modal */}
      {showViewModal && selectedRole && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowViewModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">View Role</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-lg">{selectedRole.role_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                  {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedRole.permissions.map((perm: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {perm}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No permissions assigned</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created On</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-lg">
                  {new Date(selectedRole.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-md shadow-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the role{" "}
                <span className="font-medium text-gray-900">"{roleToDelete?.role_name}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteRole}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}