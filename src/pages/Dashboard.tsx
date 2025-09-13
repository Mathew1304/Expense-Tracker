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

      setStats([
        {
          name: "Active Projects",
          value: allProjects?.length || 0,
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

      // ✅ Recent activities (phases + expenses)
      let phasesQuery = supabase
        .from("phases")
        .select("name, status, end_date, project_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);

      const { data: phases } = await phasesQuery;

      let recentExpensesQuery = supabase
        .from("expenses")
        .select("amount, date, phase_id");

      if (profile?.role === "Admin" || profile?.role === "client") {
        recentExpensesQuery = recentExpensesQuery.eq("created_by", user.id);
      }

      const { data: recentExpenses } = await recentExpensesQuery
        .order("date", { ascending: false })
        .limit(3);

      let activities: any[] = [];

      phases?.forEach((p) => {
        activities.push({
          id: `phase-${p.name}`,
          message: `Phase "${p.name}" status: ${p.status}`,
          time: p.updated_at
            ? new Date(p.updated_at).toLocaleDateString()
            : p.end_date
            ? new Date(p.end_date).toLocaleDateString()
            : "No date",
          date: new Date(p.updated_at || p.end_date || 0),
          icon: CheckCircle,
          color: "text-green-500",
        });
      });

      recentExpenses?.forEach((e) => {
        activities.push({
          id: `expense-${e.phase_id}`,
          message: `Expense of ₹${e.amount} recorded`,
          time: e.date ? new Date(e.date).toLocaleDateString() : "No date",
          date: new Date(e.date || 0),
          icon: IndianRupee,
          color: "text-blue-500",
        });
      });

      // Sort activities by date and limit
      activities = activities
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

      setRecentActivities(activities);
      setLoading(false);
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
              <div className="p-6 space-y-5 max-h-80 overflow-y-auto">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className={`flex-shrink-0 ${activity.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center">
                    No recent activities.
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
