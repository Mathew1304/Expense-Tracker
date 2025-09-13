// src/pages/Users.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/Layout/Layout";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role_id: string | null;
  roles?: {
    role_name: string;
  } | null;
  created_by: string | null;
};

type Role = {
  id: string;
  role_name: string;
};

export function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role_id: "",
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role_id: "",
  });

  const [roleFilter, setRoleFilter] = useState<string>("");

  // Fetch users + roles filtered by current admin
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
        .select("id, name, email, role_id, roles(role_name), created_by")
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

      setLoading(false);
    }

    fetchData();
  }, []);

  // Add new user
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No logged-in admin found");
      return;
    }

    const password = Math.random().toString(36).slice(-8);

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          name: formData.name,
          email: formData.email,
          role_id: formData.role_id || null,
          created_by: user.id,
        },
      ])
      .select("id, name, email, role_id, roles(role_name), created_by")
      .single();

    if (insertError) {
      console.error("Insert failed:", insertError.message);
      return;
    }

    console.log(`Send email to ${formData.email} with password ${password}`);

    setUsers((prev) => [newUser, ...prev]);
    setShowForm(false);
    setFormData({ name: "", email: "", role_id: "" });
  }

  // Delete user
  async function handleDelete(userId: string) {
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) {
      console.error("Delete failed:", error.message);
      return;
    }
    setUsers(users.filter((u) => u.id !== userId));
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
      .select("id, name, email, role_id, roles(role_name), created_by")
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

  if (loading) return <Layout>Loading...</Layout>;

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Users</h1>

        <button
          onClick={() => setShowForm(true)}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus /> Add User
        </button>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Filter by Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.role_name}>
                {r.role_name}
              </option>
            ))}
          </select>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-4 border rounded shadow space-y-4"
          >
            <div>
              <label className="block font-semibold">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block font-semibold">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block font-semibold">Role</label>
              <select
                value={formData.role_id}
                onChange={(e) =>
                  setFormData({ ...formData, role_id: e.target.value })
                }
                className="w-full border p-2 rounded"
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
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100 flex items-center gap-2"
              >
                <X /> Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Plus /> Add
              </button>
            </div>
          </form>
        )}

        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td className="border p-2">
                  {editingUser?.id === u.id ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="border p-1 rounded w-full"
                    />
                  ) : (
                    u.name
                  )}
                </td>
                <td className="border p-2">
                  {editingUser?.id === u.id ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="border p-1 rounded w-full"
                    />
                  ) : (
                    u.email
                  )}
                </td>
                <td className="border p-2">
                  {editingUser?.id === u.id ? (
                    <select
                      value={editForm.role_id}
                      onChange={(e) =>
                        setEditForm({ ...editForm, role_id: e.target.value })
                      }
                      className="border p-1 rounded w-full"
                    >
                      <option value="">Select role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.role_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    u.roles?.role_name || "-"
                  )}
                </td>
                <td className="border p-2 flex gap-2">
                  {editingUser?.id === u.id ? (
                    <>
                      <button
                        className="p-1 border rounded hover:bg-green-100 text-green-600"
                        onClick={() => handleEditSubmit(u.id)}
                      >
                        <Check />
                      </button>
                      <button
                        className="p-1 border rounded hover:bg-gray-100"
                        onClick={cancelEdit}
                      >
                        <X />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="p-1 border rounded hover:bg-gray-100"
                        onClick={() => startEdit(u)}
                      >
                        <Edit2 />
                      </button>
                      <button
                        className="p-1 border rounded hover:bg-red-100 text-red-600"
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
