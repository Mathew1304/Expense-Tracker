import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  Package,
  Users,
  CheckCircle,
  IndianRupee,
} from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // ✅ Fetch user role + status + full_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status, full_name")
        .eq("id", user.id)
        .single();

      setRole(profile?.role || null);
      setStatus(profile?.status || null);
      setName(profile?.full_name || user.email);

      // ✅ Stats queries
      let allProjectsQuery = supabase.from("projects").select("*");
      let expensesQuery = supabase.from("expenses").select("amount");
      let materialsQuery = supabase.from("materials").select("qty_required");
      let teamMembersQuery = supabase.from("profiles").select("*");

      if (profile?.role === "Admin") {
        allProjectsQuery = allProjectsQuery.eq("created_by", user.id);
        expensesQuery = expensesQuery.eq("created_by", user.id);
        materialsQuery = materialsQuery.eq("created_by", user.id);
        teamMembersQuery = teamMembersQuery.eq("created_by", user.id);
      } else if (profile?.role === "client") {
        allProjectsQuery = allProjectsQuery.eq("client_id", user.id);
        expensesQuery = expensesQuery.eq("created_by", user.id);
        materialsQuery = materialsQuery.eq("created_by", user.id);
        teamMembersQuery = teamMembersQuery.eq("created_by", user.id);
      }
      // Superadmin sees all, so no filter applied

      const { data: allProjects } = await allProjectsQuery;
      const { data: expenses } = await expensesQuery;
      const { data: materials } = await materialsQuery;
      const { data: teamMembers } = await teamMembersQuery;

      // ✅ Only count projects that are "not completed" as Active
      const activeProjectsCount =
        allProjects?.filter((p: any) => p.status !== "completed").length || 0;

      setStats([
        {
          name: "Active Projects",
          value: activeProjectsCount,
          icon: FolderOpen,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          href: "/projects",
        },
        {
          name: "Total Expenses",
          value: `₹${(
            expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
          ).toLocaleString()}`,
          icon: IndianRupee,
          color: "text-green-600",
          bgColor: "bg-green-100",
          href: "/expenses",
        },
        {
          name: "Materials Stock",
          value:
            materials?.reduce((sum, m) => sum + (m.qty_required || 0), 0) || 0,
          icon: Package,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          href: "/materials",
        },
        {
          name: "Team Members",
          value: teamMembers?.length || 0,
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          href: "/users",
        },
      ]);

      // ✅ Recent activities - simplified approach
      let recentExpensesQuery = supabase
        .from("expenses")
        .select("id, amount, date, created_at, project_id, created_by");

      if (profile?.role === "Admin") {
        recentExpensesQuery = recentExpensesQuery.eq("created_by", user.id);
      } else if (profile?.role === "client") {
        recentExpensesQuery = recentExpensesQuery.eq("created_by", user.id);
      }

      const { data: recentExpenses, error: expensesError } = await recentExpensesQuery
        .order("created_at", { ascending: false })
        .limit(5);

      console.log("Recent expenses:", recentExpenses, "Error:", expensesError);

      // ✅ Fetch recent materials
      let recentMaterialsQuery = supabase
        .from("materials")
        .select("id, name, project_id, created_by, updated_at, qty_required");

      if (profile?.role === "Admin") {
        recentMaterialsQuery = recentMaterialsQuery.eq("created_by", user.id);
      } else if (profile?.role === "client") {
        recentMaterialsQuery = recentMaterialsQuery.eq("created_by", user.id);
      }

      const { data: recentMaterials, error: materialsError } = await recentMaterialsQuery
        .order("updated_at", { ascending: false })
        .limit(5);

      console.log("Recent materials:", recentMaterials, "Error:", materialsError);

      // ✅ Fetch recent documents
      let documentsQuery = supabase
        .from("documents")
        .select("id, name, project_id, uploaded_by, upload_date, status");

      if (profile?.role === "Admin") {
        documentsQuery = documentsQuery.eq("uploaded_by", user.id);
      } else if (profile?.role === "client") {
        documentsQuery = documentsQuery.eq("uploaded_by", user.id);
      }

      const { data: recentDocuments, error: documentsError } = await documentsQuery
        .order("upload_date", { ascending: false })
        .limit(5);

      console.log("Recent documents:", recentDocuments, "Error:", documentsError);

      // ✅ Fetch recent users (only for Superadmin and Admin)
      let recentUsers: any[] = [];
      if (profile?.role === "Superadmin" || profile?.role === "Admin") {
        let usersQuery = supabase
          .from("profiles")
          .select("id, full_name, role, created_at, status");

        if (profile?.role === "Admin") {
          // Admin can only see users they created (if there's a created_by field)
          // For now, we'll show all users for Admin as well
        }

        const { data: users, error: usersError } = await usersQuery
          .order("created_at", { ascending: false })
          .limit(5);

        recentUsers = users || [];
        console.log("Recent users:", recentUsers, "Error:", usersError);
      }

      // Get all projects for lookup
      const { data: allProjectsForLookup } = await supabase
        .from("projects")
        .select("id, name");

      // Get all profiles for lookup
      const { data: allProfilesForLookup } = await supabase
        .from("profiles")
        .select("id, full_name");

      let activities: any[] = [];

      // Add expense activities with manual lookups
      recentExpenses?.forEach((expense: any, index: number) => {
        const project = allProjectsForLookup?.find(p => p.id === expense.project_id);
        const profile = allProfilesForLookup?.find(p => p.id === expense.created_by);
        
        const colors = [
          "border-blue-500", 
          "border-orange-500", 
          "border-green-500", 
          "border-purple-500", 
          "border-red-500"
        ];
        const colorIndex = index % colors.length;

        activities.push({
          id: `expense-${expense.id}`,
          type: "expense",
          amount: expense.amount,
          project: project?.name || "Unknown Project",
          addedBy: profile?.full_name || "Unknown User",
          date: expense.date || expense.created_at,
          borderColor: colors[colorIndex],
          sortDate: new Date(expense.created_at || expense.date || 0),
        });
      });

      // Add material activities
      recentMaterials?.forEach((material: any, index: number) => {
        const project = allProjectsForLookup?.find(p => p.id === material.project_id);
        const profile = allProfilesForLookup?.find(p => p.id === material.created_by);
        
        const colors = [
          "border-yellow-500", 
          "border-indigo-500", 
          "border-pink-500", 
          "border-teal-500", 
          "border-cyan-500"
        ];
        const colorIndex = index % colors.length;

        activities.push({
          id: `material-${material.id}`,
          type: "material",
          materialName: material.name,
          quantity: material.qty_required,
          project: project?.name || "Unknown Project",
          addedBy: profile?.full_name || "Unknown User",
          date: material.updated_at,
          borderColor: colors[colorIndex],
          sortDate: new Date(material.updated_at || 0),
        });
      });

      // Add document activities
      recentDocuments?.forEach((document: any, index: number) => {
        const project = allProjectsForLookup?.find(p => p.id === document.project_id);
        const profile = allProfilesForLookup?.find(p => p.id === document.uploaded_by);
        
        const colors = [
          "border-emerald-500", 
          "border-rose-500", 
          "border-violet-500", 
          "border-amber-500", 
          "border-lime-500"
        ];
        const colorIndex = index % colors.length;

        activities.push({
          id: `document-${document.id}`,
          type: "document",
          documentName: document.name,
          status: document.status,
          project: project?.name || "Unknown Project",
          addedBy: profile?.full_name || "Unknown User",
          date: document.upload_date,
          borderColor: colors[colorIndex],
          sortDate: new Date(document.upload_date || 0),
        });
      });

      // Add user activities (only for Superadmin and Admin)
      recentUsers?.forEach((userProfile: any, index: number) => {
        const colors = [
          "border-slate-500", 
          "border-gray-500", 
          "border-zinc-500", 
          "border-neutral-500", 
          "border-stone-500"
        ];
        const colorIndex = index % colors.length;

        activities.push({
          id: `user-${userProfile.id}`,
          type: "user",
          userName: userProfile.full_name,
          userRole: userProfile.role,
          userStatus: userProfile.status,
          date: userProfile.created_at,
          borderColor: colors[colorIndex],
          sortDate: new Date(userProfile.created_at || 0),
        });
      });

      // Sort activities by date and limit
      activities = activities
        .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
        .slice(0, 8);

      setRecentActivities(activities);
      setLoading(false);
      
      console.log("Final activities:", activities);
    };

    fetchData();
  }, [user]);

  // ✅ Quick Actions
  const quickActions = [
    {
      name: "Add New Project",
      description: "Create a new construction project",
      icon: FolderOpen,
      href: "/projects",
      color: "bg-blue-600 hover:bg-blue-700",
      disabled:
        role === "Superadmin" ||
        role === "User" ||
        (role === "Admin" && status !== "active"),
    },
    {
      name: "Log Expense",
      description: "Record a new project expense",
      icon: IndianRupee,
      href: "/expenses",
      color: "bg-green-600 hover:bg-green-700",
      disabled:
        role === "Superadmin" ||
        role === "User" ||
        (role === "Admin" && status !== "active"),
    },
    {
      name: "Material Request",
      description: "Request materials for project",
      icon: Package,
      href: "/materials",
      color: "bg-yellow-600 hover:bg-yellow-700",
      disabled:
        role === "Superadmin" ||
        role === "User" ||
        (role === "Admin" && status !== "active"),
    },
    {
      name: "Generate Report",
      description: "Create project or financial report",
      icon: FolderOpen,
      href: "/reports",
      color: "bg-purple-600 hover:bg-purple-700",
      disabled:
        role === "Superadmin" ||
        role === "User" ||
        (role === "Admin" && status !== "active"),
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex justify-center items-center h-screen">
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <div className="space-y-8 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {name}</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.name}
                to={stat.href}
                className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div
                      className={`flex-shrink-0 ${stat.bgColor} p-4 rounded-xl`}
                    >
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="text-2xl font-bold text-gray-900">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions + Recent Activity */}
        {role !== "client" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <div className="bg-white shadow-lg rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Quick Actions
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.name}
                      to={action.disabled ? "#" : action.href}
                      className={`${action.color} text-white p-6 rounded-xl text-center shadow-md hover:shadow-lg transition-all duration-300 ${
                        action.disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Icon className="h-10 w-10 mx-auto mb-3" />
                      <h4 className="font-semibold text-lg">{action.name}</h4>
                      <p className="text-sm opacity-90 mt-1">
                        {action.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow-lg rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Activity
                </h3>
              </div>
              <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`border-l-4 ${activity.borderColor} pl-4 py-3`}
                    >
                      {activity.type === "expense" ? (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            Expense of ₹{Number(activity.amount).toLocaleString()} recorded
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Project: {activity.project} • Added by {activity.addedBy}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      ) : activity.type === "material" ? (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            Material "{activity.materialName}" added (Qty: {activity.quantity})
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Project: {activity.project} • Added by {activity.addedBy}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      ) : activity.type === "document" ? (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            Document "{activity.documentName}" uploaded
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Project: {activity.project} • Status: {activity.status} • Uploaded by {activity.addedBy}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      ) : activity.type === "user" ? (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            New user "{activity.userName}" registered
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Role: {activity.userRole} • Status: {activity.userStatus}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            Unknown activity type
                          </h4>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No recent activities found.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}