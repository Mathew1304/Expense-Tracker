// src/components/Layout/Sidebar.tsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Chrome as Home, FolderOpen, DollarSign, Package, FileText, Users, Archive, Settings, User, IndianRupee, Layers, ShieldCheck, Hammer, Calendar, HardDrive } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const STORAGE_LIMITS = {
  free: 800,
  basic: 3072,
  pro: -1
};

export function Sidebar() {
  const location = useLocation();
  const { userRole, permissions, user } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [userPlan, setUserPlan] = useState<'free' | 'basic' | 'pro'>('free');
  const [storageUsed, setStorageUsed] = useState(0);

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

  useEffect(() => {
    if (user) {
      fetchStorageInfo(user.id);
    }
  }, [user]);

  const fetchStorageInfo = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type')
        .eq('id', userId)
        .single();

      setUserPlan(profile?.plan_type || 'free');

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', userId);

      const { data: photosData } = await supabase
        .from('phase_photos')
        .select('id')
        .eq('created_by', userId);

      const projectStorage = (projectsData?.length || 0) * 10;
      const photoStorage = (photosData?.length || 0) * 2;
      setStorageUsed(projectStorage + photoStorage);
    } catch (error) {
      console.error('Error fetching storage:', error);
    }
  };

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

  const getStorageLimit = () => {
    const limit = STORAGE_LIMITS[userPlan];
    return limit === -1 ? '∞' : `${limit}MB`;
  };

  const getStoragePercentage = () => {
    const limit = STORAGE_LIMITS[userPlan];
    if (limit === -1) return 0;
    return Math.min((storageUsed / limit) * 100, 100);
  };

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 fixed left-0 top-0 h-full z-30 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BuildMyHomes Logo" className="w-10 h-10 object-contain" />
          <h2 className="text-xl font-bold text-gray-800">Buildmyhomes</h2>
        </div>
      </div>

      <nav className="px-4 flex-1 overflow-y-auto">
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

      {/* Storage Indicator */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-medium text-gray-700">Storage</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{storageUsed}MB</span>
            <span>{getStorageLimit()}</span>
          </div>
          {userPlan !== 'pro' && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  getStoragePercentage() > 80 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${getStoragePercentage()}%` }}
              />
            </div>
          )}
          <p className="text-xs text-gray-500 capitalize">{userPlan} Plan</p>
        </div>
      </div>
    </aside>
  );
}
