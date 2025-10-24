import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  FolderOpen, 
  Layers, 
  IndianRupee, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Calendar,
  Users
} from 'lucide-react';

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
    if (user && userRole) {
      loadRolePermissions();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (permissions.length > 0) {
      loadDashboardData();
    }
  }, [permissions]);

  const loadRolePermissions = async () => {
    try {
      console.log('Loading permissions for role:', userRole);
      
      // Admin gets all permissions
      if (userRole === 'Admin') {
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
        return;
      }

      if (roleData && roleData.permissions) {
        setPermissions(roleData.permissions);
        console.log('Loaded permissions:', roleData.permissions);
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.error('Error in loadRolePermissions:', err);
      setPermissions([]);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dashboardWidgets: DashboardWidget[] = [];

      // Projects Widget
      if (hasPermission('view_projects')) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, status')
          .eq('created_by', user?.id);

        dashboardWidgets.push({
          id: 'projects',
          title: 'Total Projects',
          icon: FolderOpen,
          permission: 'view_projects',
          type: 'stat',
          data: {
            value: projects?.length || 0,
            subtitle: 'Active projects',
            color: 'blue'
          }
        });

        setStats(prev => ({ ...prev, totalProjects: projects?.length || 0 }));
      }

      // Phases Widget
      if (hasPermission('view_phases')) {
        const { data: phases } = await supabase
          .from('phases')
          .select('id, phase_name, status')
          .eq('created_by', user?.id);

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

      // Expenses Widget
      if (hasPermission('view_expenses')) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, type')
          .eq('created_by', user?.id);

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
            subtitle: 'This month',
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
            subtitle: 'This month',
            color: 'green'
          }
        });

        setStats(prev => ({ ...prev, totalExpenses, totalIncome }));
      }

      // Materials Widget
      if (hasPermission('view_materials')) {
        const { data: materials } = await supabase
          .from('materials')
          .select('id, material_name, quantity')
          .eq('created_by', user?.id);

        dashboardWidgets.push({
          id: 'materials',
          title: 'Total Materials',
          icon: Package,
          permission: 'view_materials',
          type: 'stat',
          data: {
            value: materials?.length || 0,
            subtitle: 'Items tracked',
            color: 'orange'
          }
        });

        setStats(prev => ({ ...prev, materialsCount: materials?.length || 0 }));
      }

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
    <Layout title="Dashboard" subtitle={`Welcome, ${userRole}`}>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-blue-100">
            Here's what's happening with your projects today.
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Permissions</h2>
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
    </Layout>
  );
}