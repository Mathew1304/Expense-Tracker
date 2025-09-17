// src/components/Layout/Sidebar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  FolderOpen,
  DollarSign,
  Package,
  FileText,
  Users,
  Archive,
  Settings,
  User,
  IndianRupee,
  Layers,
  ShieldCheck,
  Hammer,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  theme: string;
}

export function Sidebar({ theme }: SidebarProps) {
  const location = useLocation();
  const { userRole } = useAuth();

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"],
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      allowedRoles: ["Admin", "Project Manager", "Site Engineer"],
    },
    {
      name: "Phases",
      href: "/phases",
      icon: Layers,
      allowedRoles: ["Admin", "Project Manager", "Site Engineer", "Client"],
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: IndianRupee,
      allowedRoles: ["Admin", "Accounts"],
    },
    {
      name: "Materials",
      href: "/materials",
      icon: Package,
      allowedRoles: ["Admin", "Project Manager"],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      allowedRoles: ["Admin", "Project Manager"],
    },
    {
      name: "Document Archive",
      href: "/documents",
      icon: Archive,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer"],
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"],
    },
    {
      name: "Users",
      href: "/users",
      icon: Users,
      allowedRoles: ["Admin"],
    },
    {
      name: "Role Management",
      href: "/roles",
      icon: Settings,
      allowedRoles: ["Admin"],
    },
    {
      name: "Super Admin",
      href: "/super-admin",
      icon: ShieldCheck,
      allowedRoles: ["super_admin"],
    },
  ];

  const filteredItems = navigationItems.filter((item) =>
    item.allowedRoles.includes(userRole ?? "")
  );

  return (
    <aside
      className={`w-64 fixed left-0 top-0 h-full z-30 shadow-lg border-r transition-colors ${
        theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <div className="p-6">
        <h2 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
          Build my Homes
        </h2>
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
                      ? theme === "dark"
                        ? "bg-gray-800 text-white border-r-2 border-purple-500"
                        : "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : theme === "dark"
                      ? "text-gray-300 hover:bg-gray-800 hover:text-white"
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
