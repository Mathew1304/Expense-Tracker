import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, X } from "lucide-react";
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
    "Add Project",
    "Edit Project",
    "Delete Project",
    "View Project Status",
    "Update Progress",
    "Upload Site Updates",
    "View Expenses",
    "Manage Expenses",
    "Manage Materials",
    "View Reports",
    "Generate Reports",
    "Manage Users",
    "Manage Roles",
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
        created_by: user?.id, // ✅ link role to creator
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

  async function markRoleInactive() {
    if (!roleToDelete) return;
    const { error } = await supabase
      .from("roles")
      .update({ is_active: false })
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

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Role Management</h1>
          <button
            onClick={() => {
              setRoleName("");
              setPermissions([]);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus size={18} /> Create New Role
          </button>
        </div>

        {/* Table */}
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Role Name</th>
              <th className="p-3">Permissions</th>
              <th className="p-3">Created On</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t">
                <td className="p-3">{role.role_name}</td>
                <td className="p-3">{role.permissions?.join(", ")}</td>
                <td className="p-3">
                  {new Date(role.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 flex gap-3">
                  {/* View */}
                  <button
                    className="text-green-500 hover:text-green-700"
                    onClick={() => {
                      setSelectedRole(role);
                      setShowViewModal(true);
                    }}
                  >
                    <Eye size={18} />
                  </button>
                  {/* Edit */}
                  <button
                    className="text-blue-500 hover:text-blue-700"
                    onClick={() => {
                      setSelectedRole(role);
                      setRoleName(role.role_name);
                      setPermissions(role.permissions || []);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit size={18} />
                  </button>
                  {/* Delete */}
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {
                      setRoleToDelete(role);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Create New Role</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="border rounded-lg p-2 w-full mb-4"
            />
            <div className="mb-4">
              <h3 className="font-medium mb-2">Permissions</h3>
              <div className="grid grid-cols-1 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createRole}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Edit Role</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="border rounded-lg p-2 w-full mb-4"
            />
            <div className="mb-4">
              <h3 className="font-medium mb-2">Permissions</h3>
              <div className="grid grid-cols-1 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={updateRole}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Role Modal */}
      {showViewModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">View Role</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-2">
              <strong>Role Name:</strong> {selectedRole.role_name}
            </p>
            <p>
              <strong>Permissions:</strong>{" "}
              {selectedRole.permissions?.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 shadow-lg p-6 text-center">
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete role:{" "}
              <b>{roleToDelete?.role_name}</b>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={markRoleInactive}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
