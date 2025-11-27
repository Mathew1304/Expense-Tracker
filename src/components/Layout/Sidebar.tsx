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

        if (!error && data) {
          setRolePermissions(data.permissions || []);
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
      console.log('Fetching storage for user:', userId);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      console.log('Profile data:', profile, 'Error:', profileError);

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Default values if profile fetch fails
        setUserPlan('free');
        const userRoleFromProfile = userRole; // Fall back to auth context role
      } else {
        setUserPlan('free'); // Default to free plan since plan_type column doesn't exist
        var userRoleFromProfile = profile?.role || userRole;
      }

      console.log('User role:', userRoleFromProfile);

      // Get user's assigned project for non-admin users
      let assignedProjectId = null;
      if (userRoleFromProfile !== "Admin") {
        // Get user's assigned project from users table
        try {
          const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('project_id')
            .eq('email', user?.email)
            .single();
          
          if (userError) {
            console.log('Users table query failed, trying profiles table:', userError);
            // If users table doesn't exist or query fails, skip to profiles table
          } else if (userProfile?.project_id) {
            assignedProjectId = userProfile.project_id;
          }
        } catch (error) {
          console.log('Error querying users table:', error);
        }
        
        if (!assignedProjectId) {
          // If user not found in users table, check if they have a project_id in profiles table
          try {
            const { data: profileData, error: profileIdError } = await supabase
              .from('profiles')
              .select('project_id')
              .eq('id', user?.id)
              .single();

            if (!profileIdError && profileData?.project_id) {
              assignedProjectId = profileData.project_id;
            }
          } catch (error) {
            console.log('Error querying profiles for project_id:', error);
          }
        }
      }

      console.log('Assigned project ID:', assignedProjectId);

      // Calculate storage from Supabase Storage buckets
      let totalStorageBytes = 0;

      // Get all storage buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      console.log('Found buckets:', buckets, 'Error:', bucketsError);

      if (!bucketsError && buckets && buckets.length > 0) {
        // For each bucket, list all files and sum their sizes
        for (const bucket of buckets) {
          try {
            // Recursively get all files including in subdirectories
            const getAllFiles = async (path = '', bucketName: string): Promise<any[]> => {
              const { data, error } = await supabase.storage
                .from(bucketName)
                .list(path, {
                  limit: 1000,
                  offset: 0,
                  sortBy: { column: 'name', order: 'asc' }
                });

              if (error || !data) {
                console.log(`Error listing ${bucketName}/${path}:`, error);
                return [];
              }

              let allFiles: any[] = [];
              
              for (const item of data) {
                const fullPath = path ? `${path}/${item.name}` : item.name;
                
                if (item.id === null) {
                  // It's a folder, recurse into it
                  const subFiles = await getAllFiles(fullPath, bucketName);
                  allFiles = allFiles.concat(subFiles);
                } else {
                  // It's a file
                  allFiles.push({ ...item, fullPath });
                }
              }
              
              return allFiles;
            };

            const allFiles = await getAllFiles('', bucket.name);
            
            console.log(`Files in bucket ${bucket.name}:`, allFiles.length);
            
            // Filter files based on user role and assigned project
            let filteredFiles = allFiles;
            
            if (userRoleFromProfile === "Admin") {
              // Admin sees only their files (files in their user folder or created by them)
              filteredFiles = allFiles.filter(file => 
                file.fullPath?.includes(`/${userId}/`) || 
                file.metadata?.uploaded_by === userId ||
                file.owner === userId
              );
              console.log(`Admin filtered files in ${bucket.name}:`, filteredFiles.length);
            } else if (assignedProjectId) {
              // Non-admin users see files for their assigned project
              filteredFiles = allFiles.filter(file => 
                file.fullPath?.includes(`/${assignedProjectId}/`) ||
                file.metadata?.project_id === assignedProjectId
              );
              console.log(`User filtered files in ${bucket.name}:`, filteredFiles.length);
            } else {
              // No project assigned, no files
              filteredFiles = [];
            }

            // Sum up file sizes
            const bucketSize = filteredFiles.reduce((sum, file) => {
              const size = file.metadata?.size || 0;
              console.log(`File ${file.name}: ${size} bytes`);
              return sum + size;
            }, 0);

            console.log(`Bucket ${bucket.name} total:`, {
              totalFiles: allFiles.length,
              filteredFiles: filteredFiles.length,
              sizeBytes: bucketSize,
              sizeMB: (bucketSize / (1024 * 1024)).toFixed(2)
            });

            totalStorageBytes += bucketSize;
          } catch (err) {
            console.error(`Error processing bucket ${bucket.name}:`, err);
          }
        }
      }

      // Check for phase_photos table to calculate photo storage
      let photosData, photosError;
      
      if (userRoleFromProfile === "Admin") {
        // Get all photos from admin's projects
        const { data: adminProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('created_by', userId);
        
        const projectIds = adminProjects?.map(p => p.id) || [];
        
        if (projectIds.length > 0) {
          const result = await supabase.from('phase_photos').select('photo_url, id').in('project_id', projectIds);
          photosData = result.data;
          photosError = result.error;
        } else {
          photosData = [];
          photosError = null;
        }
      } else if (assignedProjectId) {
        const result = await supabase.from('phase_photos').select('photo_url, id').eq('project_id', assignedProjectId);
        photosData = result.data;
        photosError = result.error;
      } else {
        photosData = [];
        photosError = null;
      }
      
      console.log('Photos found:', photosData?.length || 0, 'Error:', photosError);

      // Estimate photo storage (average 2MB per photo if we can't get exact size)
      const photoStorageBytes = (photosData?.length || 0) * 2 * 1024 * 1024;

      // Also add storage from documents table (if size is stored there)
      let documentsQuery = supabase.from('documents').select('size, file_path, name');

      if (userRoleFromProfile === "Admin") {
        documentsQuery = documentsQuery.eq('uploaded_by', userId);
      } else if (assignedProjectId) {
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
        documentsQuery = documentsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data: documentsData, error: documentsError } = await documentsQuery;

      console.log('Documents fetched:', {
        count: documentsData?.length || 0,
        data: documentsData,
        error: documentsError
      });

      // Calculate document storage from size field
      let documentStorageBytes = 0;
      if (documentsData && documentsData.length > 0) {
        documentStorageBytes = documentsData.reduce((total, doc) => {
          if (doc.size) {
            // Parse size string (e.g., "1.5 KB", "1.5KB", "1.5 MB")
            const sizeMatch = doc.size.toString().match(/(\d+\.?\d*)\s*(KB|MB|GB|BYTES?|B)?/i);
            
            if (sizeMatch) {
              const value = parseFloat(sizeMatch[1]);
              const unit = (sizeMatch[2] || 'BYTES').toUpperCase();
              
              // Convert to bytes
              if (unit === 'BYTES' || unit === 'BYTE' || unit === 'B') {
                return total + value;
              } else if (unit === 'KB') {
                return total + (value * 1024);
              } else if (unit === 'MB') {
                return total + (value * 1024 * 1024);
              } else if (unit === 'GB') {
                return total + (value * 1024 * 1024 * 1024);
              }
            }
          }
          return total;
        }, 0);
      }

      // Calculate actual database text data size
      let databaseStorageBytes = 0;
      
      // Helper function to calculate size of an object
      const calculateObjectSize = (obj: any): number => {
        const jsonString = JSON.stringify(obj);
        return new Blob([jsonString]).size;
      };

      // Get full data with all columns for accurate size calculation
      let projectsFullQuery, phasesFullQuery, expensesFullQuery, materialsFullQuery, usersFullQuery;

      if (userRoleFromProfile === "Admin") {
        // Get all data created by this admin with all columns
        projectsFullQuery = supabase.from('projects').select('*').eq('created_by', userId);
        
        // For phases, expenses, materials - get all that belong to admin's projects
        const { data: adminProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('created_by', userId);
        
        const projectIds = adminProjects?.map(p => p.id) || [];
        
        console.log('Admin project IDs:', projectIds);
        
        if (projectIds.length > 0) {
          phasesFullQuery = supabase.from('phases').select('*').in('project_id', projectIds);
          expensesFullQuery = supabase.from('expenses').select('*').in('project_id', projectIds);
          materialsFullQuery = supabase.from('materials').select('*').in('project_id', projectIds);
          usersFullQuery = supabase.from('users').select('*').in('project_id', projectIds);
        } else {
          const emptyId = '00000000-0000-0000-0000-000000000000';
          phasesFullQuery = supabase.from('phases').select('*').eq('id', emptyId);
          expensesFullQuery = supabase.from('expenses').select('*').eq('id', emptyId);
          materialsFullQuery = supabase.from('materials').select('*').eq('id', emptyId);
          usersFullQuery = supabase.from('users').select('*').eq('id', emptyId);
        }
      } else if (assignedProjectId) {
        projectsFullQuery = supabase.from('projects').select('*').eq('id', assignedProjectId);
        phasesFullQuery = supabase.from('phases').select('*').eq('project_id', assignedProjectId);
        expensesFullQuery = supabase.from('expenses').select('*').eq('project_id', assignedProjectId);
        materialsFullQuery = supabase.from('materials').select('*').eq('project_id', assignedProjectId);
        usersFullQuery = supabase.from('users').select('*').eq('project_id', assignedProjectId);
      } else {
        const emptyId = '00000000-0000-0000-0000-000000000000';
        projectsFullQuery = supabase.from('projects').select('*').eq('id', emptyId);
        phasesFullQuery = supabase.from('phases').select('*').eq('id', emptyId);
        expensesFullQuery = supabase.from('expenses').select('*').eq('id', emptyId);
        materialsFullQuery = supabase.from('materials').select('*').eq('id', emptyId);
        usersFullQuery = supabase.from('users').select('*').eq('id', emptyId);
      }

      const [
        { data: projectsData },
        { data: phasesData },
        { data: expensesData },
        { data: materialsData },
        { data: usersData }
      ] = await Promise.all([
        projectsFullQuery,
        phasesFullQuery,
        expensesFullQuery,
        materialsFullQuery,
        usersFullQuery
      ]);

      // Calculate actual size of each dataset
      const projectsSize = projectsData ? calculateObjectSize(projectsData) : 0;
      const phasesSize = phasesData ? calculateObjectSize(phasesData) : 0;
      const expensesSize = expensesData ? calculateObjectSize(expensesData) : 0;
      const materialsSize = materialsData ? calculateObjectSize(materialsData) : 0;
      const usersSize = usersData ? calculateObjectSize(usersData) : 0;

      databaseStorageBytes = projectsSize + phasesSize + expensesSize + materialsSize + usersSize;

      console.log('Database records:', {
        projects: projectsData?.length || 0,
        projectsSize: `${(projectsSize / 1024).toFixed(2)} KB`,
        phases: phasesData?.length || 0,
        phasesSize: `${(phasesSize / 1024).toFixed(2)} KB`,
        expenses: expensesData?.length || 0,
        expensesSize: `${(expensesSize / 1024).toFixed(2)} KB`,
        materials: materialsData?.length || 0,
        materialsSize: `${(materialsSize / 1024).toFixed(2)} KB`,
        users: usersData?.length || 0,
        usersSize: `${(usersSize / 1024).toFixed(2)} KB`,
        totalDatabaseSize: `${(databaseStorageBytes / 1024).toFixed(2)} KB`
      });

      // Total storage in MB
      const totalStorageMB = (totalStorageBytes + photoStorageBytes + documentStorageBytes + databaseStorageBytes) / (1024 * 1024);
      
      console.log('Complete storage calculation:', {
        storageFilesBytes: totalStorageBytes,
        storageFilesMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
        photoStorageBytes: photoStorageBytes,
        photoStorageMB: (photoStorageBytes / (1024 * 1024)).toFixed(2),
        photoCount: photosData?.length || 0,
        documentStorageBytes: documentStorageBytes,
        documentStorageMB: (documentStorageBytes / (1024 * 1024)).toFixed(2),
        documentCount: documentsData?.length || 0,
        databaseStorageBytes: databaseStorageBytes,
        databaseStorageMB: (databaseStorageBytes / (1024 * 1024)).toFixed(2),
        totalStorageMB: totalStorageMB.toFixed(2),
        userRole: userRoleFromProfile
      });
      
      setStorageUsed(Math.round(totalStorageMB * 100) / 100);
    } catch (error) {
      console.error('Error fetching storage:', error);
    }
  };

  const hasPermission = (requiredPermission: string | string[]) => {
    // Admin always has access
    if (userRole === "Admin") {
      return true;
    }

    // Check if loading
    if (isLoadingPermissions) {
      return false;
    }

    // Check permissions
    if (Array.isArray(requiredPermission)) {
      const hasAccess = requiredPermission.some(perm => rolePermissions.includes(perm));
      return hasAccess;
    }

    const hasAccess = rolePermissions.includes(requiredPermission);
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
      <aside className="w-64 bg-sidebar shadow-lg border-r border-sidebar fixed left-0 top-0 h-full z-30 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BuildMyHomes Logo" className="w-10 h-10 object-contain" />
            <h2 className="text-xl font-bold text-primary">Buildmyhomes</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-secondary">Loading...</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-sidebar shadow-lg border-r border-sidebar fixed left-0 top-0 h-full z-30 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BuildMyHomes Logo" className="w-10 h-10 object-contain" />
          <h2 className="text-xl font-bold text-primary">Buildmyhomes</h2>
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
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400"
                      : "text-secondary hover:bg-tertiary hover:text-primary"
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
      <div className="p-4 border-t border-sidebar bg-secondary">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-4 h-4 text-secondary" />
          <span className="text-xs font-medium text-primary">Storage</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-secondary">
            <span>{storageUsed.toFixed(2)}MB</span>
            <span>{getStorageLimit()}</span>
          </div>
          {userPlan !== 'pro' && (
            <div className="w-full bg-tertiary rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  getStoragePercentage() > 80 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${getStoragePercentage()}%` }}
              />
            </div>
          )}
          <p className="text-xs text-tertiary capitalize">{userPlan} Plan</p>
        </div>
      </div>
    </aside>
  );
}