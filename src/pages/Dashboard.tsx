import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  Package,
  Users,
  TrendingUp,
  CheckCircle,
  IndianRupee,
} from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [clientPhases, setClientPhases] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<string>("last7days");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // ✅ Fetch user role + status
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

      setRole(profile?.role || null);
      setStatus(profile?.status || null);

      // ✅ If client, fetch only their projects & phases
      if (profile?.role === "client") {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name")
          .eq("client_id", user.id);

        setClientProjects(projects || []);

        if (projects && projects.length > 0) {
          const projectIds = projects.map((p) => p.id);
          const { data: phases } = await supabase
            .from("phases")
            .select("id, name, status, project_id, start_date, end_date")
            .in("project_id", projectIds);

          setClientPhases(phases || []);
        }
      }

      // ✅ Restrict all queries to created_by = current user
      const { data: allProjects } = await supabase
        .from("projects")
        .select("*")
        .eq("created_by", user.id);

      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("created_by", user.id);

      const { data: materials } = await supabase
        .from("materials")
        .select("qty_required")
        .eq("created_by", user.id);

      const { data: teamMembers } = await supabase.from("profiles").select("*");

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

      // ✅ Recent activities (filter by created_by as well)
      const now = new Date();
      let query = supabase
        .from("phases")
        .select("name, status, end_date, project_id")
        .order("end_date", { ascending: false })
        .limit(5);

      if (dateFilter === "last7days") {
        query = query.gte(
          "end_date",
          new Date(now.setDate(now.getDate() - 7)).toISOString()
        );
      } else if (dateFilter === "last30days") {
        query = query.gte(
          "end_date",
          new Date(now.setDate(now.getDate() - 30)).toISOString()
        );
      }

      const { data: phases } = await query;

      const { data: recentExpenses } = await supabase
        .from("expenses")
        .select("amount, date, phase_id")
        .eq("created_by", user.id)
        .order("date", { ascending: false })
        .limit(3);

      let activities: any[] = [];

      phases?.forEach((p) => {
        activities.push({
          id: `phase-${p.name}`,
          message: `Phase "${p.name}" status: ${p.status}`,
          time: p.end_date
            ? new Date(p.end_date).toLocaleDateString()
            : "No date",
          icon: CheckCircle,
          color: "text-green-500",
        });
      });

      recentExpenses?.forEach((e) => {
        activities.push({
          id: `expense-${e.phase_id}`,
          message: `Expense of ₹${e.amount} recorded`,
          time: e.date ? new Date(e.date).toLocaleDateString() : "No date",
          icon: IndianRupee,
          color: "text-blue-500",
        });
      });

      setRecentActivities(activities.slice(0, 5));
    };

    fetchData();
  }, [user, dateFilter]);

  // Quick Actions remain unchanged
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
      icon: TrendingUp,
      href: "/reports",
      color: "bg-purple-600 hover:bg-purple-700",
      disabled:
        role === "Superadmin" ||
        role === "User" ||
        (role === "Admin" && status !== "active"),
    },
  ];

  const getProgress = (phases: any[]) => {
    const completed = phases.filter((p) => p.status === "completed").length;
    const total = phases.length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-8 p-6">
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

        {/* Client Projects + Phases */}
        {role === "client" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
            {clientProjects.map((project) => {
              const projectPhases = clientPhases.filter(
                (p) => p.project_id === project.id
              );
              const progress = getProgress(projectPhases);
              return (
                <div
                  key={project.id}
                  className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {project.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        progress === 100
                          ? "bg-green-100 text-green-800"
                          : progress > 50
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {progress.toFixed(0)}% Complete
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {projectPhases.length > 0 ? (
                      projectPhases.map((phase) => (
                        <div
                          key={phase.id}
                          className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <p className="font-medium text-gray-700">{phase.name}</p>
                          <p className="text-sm text-gray-600">
                            Status: {phase.status}
                          </p>
                          <p className="text-xs text-gray-500">
                            {phase.start_date} – {phase.end_date || "Ongoing"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No phases available yet.
                      </p>
                    )}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Non-client: Quick Actions + Recent Activity */}
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
                        action.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : ""
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
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
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
