// src/components/Layout/Sidebar.tsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Chrome as Home, FolderOpen, DollarSign, Package, FileText, Users, Archive, Settings, User, IndianRupee, Layers, ShieldCheck, Hammer, Calendar } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

export function Sidebar() {
  const location = useLocation();
  const { userRole, permissions, user } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  useEffect(() => {
    async function fetchRolePermissions() {
      if (userRole && user) {
        const { data, error } = await supabase
          .from("roles")
          .select("permissions")
          .eq("role_name", userRole)
          .eq("is_active", true)
          .maybeSingle();

        if (!error && data) {
          setRolePermissions(data.permissions || []);
        }
      }
    }

    fetchRolePermissions();
  }, [userRole, user]);

  const hasPermission = (requiredPermission: string | string[]) => {
    if (userRole === "Admin") return true;

    if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(perm => rolePermissions.includes(perm));
    }

    return rolePermissions.includes(requiredPermission);
  };

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"],
      permission: null,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      allowedRoles: ["Admin", "Project Manager", "Site Engineer"],
      permission: ["Add Project", "Edit Project", "View Project Status"],
    },
    {
      name: "Phases",
      href: "/phases",
      icon: Layers,
      allowedRoles: ["Admin", "Project Manager", "Site Engineer", "Client"],
      permission: ["View Project Status", "Update Progress"],
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: IndianRupee,
      allowedRoles: ["Admin", "Accounts"],
      permission: ["View Expenses", "Manage Expenses"],
    },
    {
      name: "Materials",
      href: "/materials",
      icon: Package,
      allowedRoles: ["Admin", "Project Manager"],
      permission: "Manage Materials",
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      allowedRoles: ["Admin", "Project Manager"],
      permission: ["View Reports", "Generate Reports"],
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: Calendar,
      allowedRoles: ["Admin", "Project Manager", "Site Engineer", "Client"],
      permission: null,
    },
    {
      name: "Document Archive",
      href: "/documents",
      icon: Archive,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer"],
      permission: null,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"],
      permission: null,
    },
    {
      name: "Users",
      href: "/users",
      icon: Users,
      allowedRoles: ["Admin"],
      permission: "Manage Users",
    },
    {
      name: "Role Management",
      href: "/roles",
      icon: Settings,
      allowedRoles: ["Admin"],
      permission: "Manage Roles",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      allowedRoles: ["Admin", "Project Manager"],
      permission: null,
    },
    {
      name: "Super Admin",
      href: "/super-admin",
      icon: ShieldCheck,
      allowedRoles: ["super_admin"],
      permission: null,
    },
  ];

  const filteredItems = navigationItems.filter((item) => {
    const roleAllowed = item.allowedRoles.includes(userRole ?? "");

    if (!roleAllowed) return false;

    if (!item.permission) return true;

    return hasPermission(item.permission);
  });

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 fixed left-0 top-0 h-full z-30">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800">Buildmyhomes</h2>
      </div>

      <nav className="px-4">
        <ul className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
