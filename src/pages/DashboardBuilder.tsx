import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface Role {
  id: string;
  role_name: string;
  permissions: string[];
  created_by: string;
}

export function DashboardBuilder() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRoles();
    }
  }, [user]);

  const fetchRoles = async () => {
    setLoading(true);
    
    // Get current user's ID
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      console.error('No logged-in user found');
      setLoading(false);
      return;
    }

    // Fetch only roles created by this admin
    const { data, error } = await supabase
      .from('roles')
      .select('id, role_name, permissions, created_by')
      .eq('is_active', true)
      .eq('created_by', currentUser.id)
      .order('created_at', { ascending: false });

    console.log('Fetching roles for admin:', currentUser.id);
    console.log('Roles found:', data);

    if (!error && data) {
      setRoles(data);
    } else {
      console.error('Error fetching roles:', error);
    }
    
    setLoading(false);
  };

  const getDashboardWidgets = (permissions: string[]) => {
    const widgets = [];

    if (permissions.includes('view_projects')) {
      widgets.push({
        name: 'Projects Overview',
        description: 'View total projects, status breakdown',
        color: 'blue'
      });
    }

    if (permissions.includes('view_phases')) {
      widgets.push({
        name: 'Phases Progress',
        description: 'Track active phases and completion',
        color: 'purple'
      });
    }

    if (permissions.includes('view_expenses')) {
      widgets.push({
        name: 'Expenses & Income',
        description: 'Financial overview and trends',
        color: 'green'
      });
    }

    if (permissions.includes('view_materials')) {
      widgets.push({
        name: 'Materials Inventory',
        description: 'Stock levels and material tracking',
        color: 'orange'
      });
    }

    if (permissions.includes('view_reports')) {
      widgets.push({
        name: 'Reports Dashboard',
        description: 'Generate and view reports',
        color: 'indigo'
      });
    }

    if (permissions.includes('view_calendar')) {
      widgets.push({
        name: 'Calendar Events',
        description: 'Upcoming tasks and deadlines',
        color: 'pink'
      });
    }

    return widgets;
  };

  const getSidebarItems = (permissions: string[]) => {
    const items = [
      { name: 'Profile', permission: null, always: true }
    ];

    const permissionMap = [
      { name: 'Dashboard', permission: 'view_dashboard' },
      { name: 'Projects', permission: 'view_projects' },
      { name: 'Phases', permission: 'view_phases' },
      { name: 'Expenses', permission: 'view_expenses' },
      { name: 'Materials', permission: 'view_materials' },
      { name: 'Reports', permission: 'view_reports' },
      { name: 'Calendar', permission: 'view_calendar' },
      { name: 'Documents', permission: 'view_documents' },
      { name: 'Users', permission: 'view_users' },
      { name: 'Role Management', permission: 'view_roles' },
      { name: 'Settings', permission: 'view_settings' },
    ];

    permissionMap.forEach(item => {
      if (!item.permission || permissions.includes(item.permission)) {
        items.push(item);
      }
    });

    return items;
  };

  return (
    <Layout title="Dashboard Builder" subtitle="Preview role-based dashboards">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Builder</h1>
          <p className="text-gray-600">
            Select a role to preview how their dashboard will look based on assigned permissions.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading roles...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Role</h2>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setSelectedRole(role);
                    setPreviewMode(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedRole?.id === role.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-gray-900">{role.role_name}</div>
                  <div className="text-sm text-gray-500">
                    {role.permissions?.length || 0} permissions
                  </div>
                </button>
              ))}
              {roles.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-2">
                    No roles found.
                  </p>
                  <p className="text-gray-400 text-xs">
                    Create roles in Role Management first to preview dashboards.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedRole ? (
              <>
                {/* Role Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedRole.role_name} Dashboard Preview
                    </h2>
                    <button
                      onClick={() => setPreviewMode(!previewMode)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {previewMode ? 'Hide' : 'Show'} Preview
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Assigned Permissions</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRole.permissions?.map((perm) => (
                          <div
                            key={perm}
                            className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-700">{perm}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Dashboard Widgets</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {getDashboardWidgets(selectedRole.permissions || []).map((widget, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border-2 border-${widget.color}-200 bg-${widget.color}-50`}
                          >
                            <div className="font-medium text-gray-900">{widget.name}</div>
                            <div className="text-sm text-gray-600">{widget.description}</div>
                          </div>
                        ))}
                        {getDashboardWidgets(selectedRole.permissions || []).length === 0 && (
                          <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-red-700">
                              No dashboard widgets available. Assign permissions to enable widgets.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Sidebar Navigation</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <ul className="space-y-2">
                          {getSidebarItems(selectedRole.permissions || []).map((item, index) => (
                            <li
                              key={index}
                              className="flex items-center gap-2 text-sm text-gray-700"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              {item.name}
                              {item.always && (
                                <span className="text-xs text-gray-500">(Always visible)</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                {previewMode && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border-4 border-blue-500 p-6">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-300">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">
                        Live Preview - {selectedRole.role_name} Dashboard View
                      </h3>
                      <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Preview Mode
                      </span>
                    </div>

                    <div className="space-y-6">
                      {/* Welcome Banner */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                        <h1 className="text-2xl font-bold mb-2">
                          Welcome back! 👋
                        </h1>
                        <p className="text-blue-100">
                          Here's what's happening with your projects today.
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {getDashboardWidgets(selectedRole.permissions || []).map((widget, index) => {
                          const sampleValues: Record<string, { value: string; subtitle: string }> = {
                            'Projects Overview': { value: '12', subtitle: 'Active projects' },
                            'Phases Progress': { value: '8', subtitle: 'of 15 total' },
                            'Expenses & Income': { value: '₹2,45,000', subtitle: 'This month' },
                            'Materials Inventory': { value: '45', subtitle: 'Items tracked' },
                            'Reports Dashboard': { value: '23', subtitle: 'Reports generated' },
                            'Calendar Events': { value: '6', subtitle: 'Upcoming events' }
                          };

                          const sampleData = sampleValues[widget.name] || { value: '--', subtitle: 'Sample data' };
                          const colorClasses = {
                            blue: 'bg-blue-500 text-blue-600 bg-opacity-10',
                            purple: 'bg-purple-500 text-purple-600 bg-opacity-10',
                            green: 'bg-green-500 text-green-600 bg-opacity-10',
                            orange: 'bg-orange-500 text-orange-600 bg-opacity-10',
                            indigo: 'bg-indigo-500 text-indigo-600 bg-opacity-10',
                            pink: 'bg-pink-500 text-pink-600 bg-opacity-10'
                          };

                          const bgColor = colorClasses[widget.color as keyof typeof colorClasses] || colorClasses.blue;

                          return (
                            <div
                              key={index}
                              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg ${bgColor}`}>
                                  <div className={`w-6 h-6 rounded ${widget.color === 'blue' ? 'bg-blue-600' : widget.color === 'purple' ? 'bg-purple-600' : widget.color === 'green' ? 'bg-green-600' : widget.color === 'orange' ? 'bg-orange-600' : widget.color === 'indigo' ? 'bg-indigo-600' : 'bg-pink-600'}`}></div>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">{widget.name}</p>
                                <p className="text-3xl font-bold text-gray-900 mb-1">
                                  {sampleData.value}
                                </p>
                                <p className="text-xs text-gray-500">{sampleData.subtitle}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Actions */}
                      {getDashboardWidgets(selectedRole.permissions || []).length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(selectedRole.permissions || []).includes('view_projects') && (
                              <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                <div className="w-8 h-8 bg-blue-600 rounded mb-2"></div>
                                <span className="text-sm font-medium text-gray-900">Projects</span>
                              </button>
                            )}
                            {(selectedRole.permissions || []).includes('view_phases') && (
                              <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                                <div className="w-8 h-8 bg-purple-600 rounded mb-2"></div>
                                <span className="text-sm font-medium text-gray-900">Phases</span>
                              </button>
                            )}
                            {(selectedRole.permissions || []).includes('view_expenses') && (
                              <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                                <div className="w-8 h-8 bg-green-600 rounded mb-2"></div>
                                <span className="text-sm font-medium text-gray-900">Expenses</span>
                              </button>
                            )}
                            {(selectedRole.permissions || []).includes('view_materials') && (
                              <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                                <div className="w-8 h-8 bg-orange-600 rounded mb-2"></div>
                                <span className="text-sm font-medium text-gray-900">Materials</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Permissions Display */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Permissions</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(selectedRole.permissions || []).map((permission) => (
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

                      {getDashboardWidgets(selectedRole.permissions || []).length === 0 && (
                        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Dashboard Access</h3>
                          <p className="text-gray-600 max-w-md mx-auto">
                            This role doesn't have any view permissions assigned. Users with this role won't see any dashboard widgets.
                          </p>
                          <p className="text-sm text-gray-500 mt-4">
                            Assign permissions like "view_projects", "view_phases", or "view_expenses" to enable dashboard widgets.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <RefreshCw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Role</h3>
                <p className="text-gray-600">
                  Choose a role from the list to preview its dashboard configuration.
                </p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </Layout>
  );
}