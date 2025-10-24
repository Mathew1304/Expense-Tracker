import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FolderOpen, Layers, IndianRupee, Package, TrendingUp, TrendingDown, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, FileText, Calendar, Users } from 'lucide-react';

interface DashboardWidget {
  id: string;
  title: string;
  icon: any;
  permission: string;
  type: 'stat' | 'chart' | 'list';
  data?: any;
}

export function DynamicDashboard() {
  const { user, userRole } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activePhases: 0,
    totalExpenses: 0,
    totalIncome: 0,
    materialsCount: 0,
    pendingTasks: 0
  });

  useEffect(() => {
    console.log('=== DynamicDashboard Mounted ===');
    console.log('User:', user);
    console.log('UserRole:', userRole);
    
    if (user && userRole) {
      console.log('Loading permissions for user...');
      loadRolePermissions();
    } else {
      console.warn('Missing user or userRole:', { user: !!user, userRole });
    }
  }, [user, userRole]);

  useEffect(() => {
    console.log('Permissions changed:', permissions);
    console.log('Permissions length:', permissions.length);
    
    if (permissions.length > 0) {
      console.log('Loading dashboard data...');
      loadDashboardData();
    } else {
      console.log('No permissions - skipping dashboard data load');
      setLoading(false);
    }
  }, [permissions]);

  const loadRolePermissions = async () => {
    try {
      console.log('Loading permissions for role:', userRole);
      
      // Admin gets all permissions
      if (userRole === 'Admin') {
        console.log('User is Admin - granting all permissions');
        setPermissions([
          'view_dashboard',
          'view_projects',
          'view_phases',
          'view_expenses',
          'view_materials',
          'view_reports',
          'view_calendar',
          'view_users'
        ]);
        setLoading(false);
        return;
      }

      // Fetch role permissions from database
      const { data: roleData, error } = await supabase
        .from('roles')
        .select('permissions, role_name')
        .eq('role_name', userRole.trim())
        .eq('is_active', true)
        .single();

      console.log('Role query result:', { roleData, error });

      if (error) {
        console.error('Error loading role:', error);
        setPermissions([]);
        setLoading(false);
        return;
      }

      if (roleData && roleData.permissions) {
        console.log('Setting permissions:', roleData.permissions);
        setPermissions(roleData.permissions);
      } else {
        console.warn('No permissions found for role:', userRole);
        setPermissions([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in loadRolePermissions:', err);
      setPermissions([]);
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dashboardWidgets: DashboardWidget[] = [];

      // Get user's assigned project from users table
      const { data: userProfile } = await supabase
        .from('users')
        .select('project_id, role_id')
        .eq('email', user?.email)
        .single();

      const assignedProjectId = userProfile?.project_id;
      
      console.log('User assigned project:', assignedProjectId);
      console.log('User profile data:', userProfile);

      // Projects Widget - only show assigned project
      if (hasPermission('view_projects')) {
        let projectsQuery = supabase
          .from('projects')
          .select('id, name, status');

        if (userRole !== 'Admin') {
          // Non-admin users only see their assigned project
          if (assignedProjectId) {
            projectsQuery = projectsQuery.eq('id', assignedProjectId);
          } else {
            // If no project assigned, return empty result
            projectsQuery = projectsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          // Admin sees all their projects
          projectsQuery = projectsQuery.eq('created_by', user?.id);
        }

        const { data: projects } = await projectsQuery;

        dashboardWidgets.push({
          id: 'projects',
          title: 'Total Projects',
          icon: FolderOpen,
          permission: 'view_projects',
          type: 'stat',
          data: {
            value: projects?.length || 0,
            subtitle: userRole === 'Admin' ? 'Active projects' : assignedProjectId ? 'Assigned project' : 'No project assigned',
            color: 'blue'
          }
        });

        setStats(prev => ({ ...prev, totalProjects: projects?.length || 0 }));
      }

      // Phases Widget - only for assigned project
      if (hasPermission('view_phases')) {
        let phasesQuery = supabase
          .from('phases')
          .select('id, phase_name, status, project_id');

        if (userRole !== 'Admin' && assignedProjectId) {
          phasesQuery = phasesQuery.eq('project_id', assignedProjectId);
        } else if (userRole === 'Admin') {
          phasesQuery = phasesQuery.eq('created_by', user?.id);
        } else {
          // No project assigned, return empty result
          phasesQuery = phasesQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
        }

        const { data: phases } = await phasesQuery;

        const activePhases = phases?.filter(p => p.status === 'in_progress')?.length || 0;

        dashboardWidgets.push({
          id: 'phases',
          title: 'Active Phases',
          icon: Layers,
          permission: 'view_phases',
          type: 'stat',
          data: {
            value: activePhases,
            subtitle: `of ${phases?.length || 0} total`,
            color: 'purple'
          }
        });

        setStats(prev => ({ ...prev, activePhases }));
      }

      // Expenses Widget - only for assigned project
      if (hasPermission('view_expenses')) {
        let expensesQuery = supabase
          .from('expenses')
          .select('amount, type, project_id');

        if (userRole !== 'Admin' && assignedProjectId) {
          expensesQuery = expensesQuery.eq('project_id', assignedProjectId);
        } else if (userRole === 'Admin') {
          expensesQuery = expensesQuery.eq('created_by', user?.id);
        } else {
          // No project assigned, return empty result
          expensesQuery = expensesQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
        }

        const { data: expenses } = await expensesQuery;

        const totalExpenses = expenses
          ?.filter(e => e.type === 'expense')
          ?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        const totalIncome = expenses
          ?.filter(e => e.type === 'income')
          ?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        dashboardWidgets.push({
          id: 'expenses',
          title: 'Total Expenses',
          icon: TrendingDown,
          permission: 'view_expenses',
          type: 'stat',
          data: {
            value: `₹${totalExpenses.toLocaleString()}`,
            subtitle: assignedProjectId ? 'This project' : 'No data',
            color: 'red'
          }
        });

        dashboardWidgets.push({
          id: 'income',
          title: 'Total Income',
          icon: TrendingUp,
          permission: 'view_expenses',
          type: 'stat',
          data: {
            value: `₹${totalIncome.toLocaleString()}`,
            subtitle: assignedProjectId ? 'This project' : 'No data',
            color: 'green'
          }
        });

        setStats(prev => ({ ...prev, totalExpenses, totalIncome }));
      }

      // Materials Widget - only for assigned project
      if (hasPermission('view_materials')) {
        let materialsQuery = supabase
          .from('materials')
          .select('id, material_name, quantity, project_id');

        if (userRole !== 'Admin' && assignedProjectId) {
          materialsQuery = materialsQuery.eq('project_id', assignedProjectId);
        } else if (userRole === 'Admin') {
          materialsQuery = materialsQuery.eq('created_by', user?.id);
        } else {
          // No project assigned, return empty result
          materialsQuery = materialsQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
        }

        const { data: materials } = await materialsQuery;

        dashboardWidgets.push({
          id: 'materials',
          title: 'Total Materials',
          icon: Package,
          permission: 'view_materials',
          type: 'stat',
          data: {
            value: materials?.length || 0,
            subtitle: assignedProjectId ? 'Items tracked' : 'No data',
            color: 'orange'
          }
        });

        setStats(prev => ({ ...prev, materialsCount: materials?.length || 0 }));
      }

      console.log('Dashboard widgets loaded:', dashboardWidgets.length);
      setWidgets(dashboardWidgets);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-600',
      purple: 'bg-purple-500 text-purple-600',
      red: 'bg-red-500 text-red-600',
      green: 'bg-green-500 text-green-600',
      orange: 'bg-orange-500 text-orange-600',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
            <p className="text-xs text-gray-400 mt-2">User: {user?.email}</p>
            <p className="text-xs text-gray-400">Role: {userRole || 'Not set'}</p>
            <p className="text-xs text-gray-400">Permissions: {permissions.length}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show debug info if no widgets but we have user/role
  if (widgets.length === 0 && user && userRole) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-lg">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard Loading Issue</h2>
            <div className="text-left space-y-2 mb-4 text-sm">
              <p><strong>User Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {userRole || 'Not set'}</p>
              <p><strong>Permissions Count:</strong> {permissions.length}</p>
              {permissions.length > 0 && (
                <div>
                  <strong>Permissions:</strong>
                  <ul className="list-disc list-inside">
                    {permissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
            {permissions.length === 0 ? (
              <p className="text-gray-600 mb-4">
                No permissions found for your role. Please contact your administrator.
              </p>
            ) : (
              <p className="text-gray-600 mb-4">
                Permissions loaded but no dashboard data available.
              </p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  if (widgets.length === 0) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Access</h2>
            <p className="text-gray-600 mb-4">
              You don't have permissions to view any dashboard widgets. 
              Please contact your administrator to get access.
            </p>
            <p className="text-sm text-gray-500">
              Current Role: <span className="font-medium">{userRole}</span>
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard" subtitle={`Welcome, ${userRole} - Project Dashboard`}>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-blue-100">
            Here's what's happening with your assigned project today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            const colorClasses = getColorClasses(widget.data.color);
            
            return (
              <div
                key={widget.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-opacity-10 ${colorClasses.split(' ')[0]}`}>
                    <Icon className={`w-6 h-6 ${colorClasses.split(' ')[1]}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{widget.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {widget.data.value}
                  </p>
                  <p className="text-xs text-gray-500">{widget.data.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {hasPermission('view_projects') && (
              <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <FolderOpen className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Projects</span>
              </button>
            )}
            {hasPermission('view_phases') && (
              <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <Layers className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Phases</span>
              </button>
            )}
            {hasPermission('view_expenses') && (
              <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <IndianRupee className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Expenses</span>
              </button>
            )}
            {hasPermission('view_materials') && (
              <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                <Package className="w-8 h-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Materials</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h2>
          <div className="space-y-4">
            {/* Project Assignment Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Your Assignment</h3>
              <div className="text-sm text-blue-700">
                <p><strong>Role:</strong> {userRole}</p>
                <p><strong>Access Level:</strong> Project-specific data only</p>
                <p><strong>Permissions:</strong> {permissions.length} active permissions</p>
              </div>
            </div>
            
            {/* Permissions Grid */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Your Permissions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {permissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}