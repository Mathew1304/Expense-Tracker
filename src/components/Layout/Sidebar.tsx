// src/components/Layout/Sidebar.tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Chrome as Home, FolderOpen, Package, FileText, Users, Archive, Settings, IndianRupee, Layers, Calendar, HardDrive } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const STORAGE_LIMITS = {
  free: 800,
  basic: 3072,
  pro: -1
};

export function Sidebar() {
  const location = useLocation();
  const { userRole, user } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [userPlan, setUserPlan] = useState<'free' | 'basic' | 'pro'>('free');
  const [storageUsed, setStorageUsed] = useState(0);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    async function fetchRolePermissions() {
      if (userRole && user) {
        setIsLoadingPermissions(true);
        
        // Fetch the role and its permissions
        const { data, error } = await supabase
          .from("roles")
          .select("permissions, role_name")
          .eq("role_name", userRole)
          .eq("is_active", true)
          .maybeSingle();

        console.log('Fetching permissions for role:', userRole);
        console.log('Role data:', data);
        console.log('Role error:', error);

        if (!error && data) {
          setRolePermissions(data.permissions || []);
          console.log('Loaded permissions:', data.permissions);
        } else {
          console.error('Failed to load role permissions:', error);
          setRolePermissions([]);
        }
        
        setIsLoadingPermissions(false);
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
        .select('plan_type, role')
        .eq('id', userId)
        .single();

      setUserPlan(profile?.plan_type || 'free');

      // Get user's assigned project for non-admin users
      let assignedProjectId = null;
      if (profile?.role !== "Admin") {
        // Get user's assigned project from users table
        const { data: userProfile } = await supabase
          .from('users')
          .select('project_id')
          .eq('email', user?.email)
          .single();
        
        if (userProfile?.project_id) {
          assignedProjectId = userProfile.project_id;
        } else {
          // If user not found in users table, check if they have a project_id in profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('project_id')
            .eq('id', user?.id)
            .single();

          if (profileData?.project_id) {
            assignedProjectId = profileData.project_id;
          }
        }
      }

      let projectsQuery = supabase.from('projects').select('id');
      let photosQuery = supabase.from('phase_photos').select('id');
      let documentsQuery = supabase.from('documents').select('size');

      if (profile?.role === "Admin") {
        // Admin sees projects they created
        projectsQuery = projectsQuery.eq('created_by', userId);
        photosQuery = photosQuery.eq('created_by', userId);
        documentsQuery = documentsQuery.eq('uploaded_by', userId);
      } else if (assignedProjectId) {
        // Non-admin users see data for their assigned project
        projectsQuery = projectsQuery.eq('id', assignedProjectId);
        photosQuery = photosQuery.eq('project_id', assignedProjectId);
        // For documents, we need to get the project name first, then filter by project name
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', assignedProjectId)
          .single();
        
        if (projectData?.name) {
          documentsQuery = documentsQuery.eq('project', projectData.name);
        } else {
          documentsQuery = documentsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else {
        // If no project assigned, return empty results
        projectsQuery = projectsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        photosQuery = photosQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        documentsQuery = documentsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }

      const [
        { data: projectsData, error: projectsError }, 
        { data: photosData, error: photosError },
        { data: documentsData, error: documentsError }
      ] = await Promise.all([
        projectsQuery,
        photosQuery,
        documentsQuery
      ]);

      if (projectsError) {
        console.error('Error fetching projects for storage:', projectsError);
      }
      if (photosError) {
        console.error('Error fetching photos for storage:', photosError);
      }
      if (documentsError) {
        console.error('Error fetching documents for storage:', documentsError);
      }

      // Calculate storage from actual file sizes
      const projectStorage = (projectsData?.length || 0) * 10; // Base storage per project
      const photoStorage = (photosData?.length || 0) * 2; // Base storage per photo
      
      // Calculate document storage from actual file sizes
      let documentStorage = 0;
      if (documentsData && documentsData.length > 0) {
        documentStorage = documentsData.reduce((total, doc) => {
          if (doc.size) {
            // Parse size string (e.g., "1.5 KB" -> 1.5)
            const sizeMatch = doc.size.match(/(\d+\.?\d*)\s*(KB|MB|GB)/i);
            if (sizeMatch) {
              const value = parseFloat(sizeMatch[1]);
              const unit = sizeMatch[2].toUpperCase();
              if (unit === 'KB') return total + (value / 1024); // Convert KB to MB
              if (unit === 'MB') return total + value;
              if (unit === 'GB') return total + (value * 1024); // Convert GB to MB
            }
          }
          return total;
        }, 0);
      }
      
      const totalStorage = projectStorage + photoStorage + documentStorage;
      
      console.log('Storage calculation:', {
        projectsCount: projectsData?.length || 0,
        photosCount: photosData?.length || 0,
        documentsCount: documentsData?.length || 0,
        projectStorage,
        photoStorage,
        documentStorage,
        totalStorage,
        userRole: profile?.role
      });
      
      setStorageUsed(totalStorage);
    } catch (error) {
      console.error('Error fetching storage:', error);
    }
  };

  const hasPermission = (requiredPermission: string | string[]) => {
    // Admin always has access
    if (userRole === "Admin") {
      console.log('Admin user - granting access to:', requiredPermission);
      return true;
    }

    // Check if loading
    if (isLoadingPermissions) {
      return false;
    }

    // Check permissions
    if (Array.isArray(requiredPermission)) {
      const hasAccess = requiredPermission.some(perm => rolePermissions.includes(perm));
      console.log('Checking array permissions:', requiredPermission, 'Has access:', hasAccess);
      return hasAccess;
    }

    const hasAccess = rolePermissions.includes(requiredPermission);
    console.log('Checking permission:', requiredPermission, 'Has access:', hasAccess);
    return hasAccess;
  };

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
      permission: "view_dashboard",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      permission: "view_projects",
    },
    {
      name: "Phases",
      href: "/phases",
      icon: Layers,
      permission: "view_phases",
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: IndianRupee,
      permission: "view_expenses",
    },
    {
      name: "Materials",
      href: "/materials",
      icon: Package,
      permission: "view_materials",
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      permission: "view_reports",
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: Calendar,
      permission: "view_calendar",
    },
    {
      name: "Document Archive",
      href: "/documents",
      icon: Archive,
      permission: "view_documents",
    },
    {
      name: "Users",
      href: "/users",
      icon: Users,
      permission: "view_users",
    },
    {
      name: "Role Management",
      href: "/roles",
      icon: Settings,
      permission: "view_roles",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      permission: "view_settings",
    },
  ];

  const filteredItems = navigationItems.filter((item) => {
    // Profile is always accessible
    if (!item.permission) return true;

    // Check if user has the required permission
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

  // Show loading state
  if (isLoadingPermissions) {
    return (
      <aside className="w-64 bg-white shadow-lg border-r border-gray-200 fixed left-0 top-0 h-full z-30 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BuildMyHomes Logo" className="w-10 h-10 object-contain" />
            <h2 className="text-xl font-bold text-gray-800">Buildmyhomes</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </aside>
    );
  }

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