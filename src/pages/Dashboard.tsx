import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  Package,
  Users,
  CheckCircle,
  IndianRupee,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  DollarSign,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface ChartData {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

interface ProjectStatusData {
  name: string;
  value: number;
  color: string;
}

interface ExpenseCategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('30');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [projectStatusData, setProjectStatusData] = useState<ProjectStatusData[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<ExpenseCategoryData[]>([]);
  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, status, full_name")
        .eq("id", user.id)
        .single();

      setRole(profile?.role || null);
      setStatus(profile?.status || null);
      setName(profile?.full_name || user.email);

      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timePeriod));

      // Base queries with proper filtering
      let projectsQuery = supabase.from("projects").select("*");
      let expensesQuery = supabase.from("expenses").select("*");
      let materialsQuery = supabase.from("materials").select("*");
      let teamMembersQuery = supabase.from("profiles").select("*");

      // Apply role-based filters
      if (profile?.role === "Admin") {
        projectsQuery = projectsQuery.eq("created_by", user.id);
        expensesQuery = expensesQuery.eq("created_by", user.id);
        materialsQuery = materialsQuery.eq("created_by", user.id);
        teamMembersQuery = teamMembersQuery.eq("created_by", user.id);
      } else if (profile?.role === "client") {
        projectsQuery = projectsQuery.eq("client_id", user.id);
        expensesQuery = expensesQuery.eq("created_by", user.id);
        materialsQuery = materialsQuery.eq("created_by", user.id);
        teamMembersQuery = teamMembersQuery.eq("created_by", user.id);
      }

      const [
        { data: allProjects },
        { data: expenses },
        { data: materials },
        { data: teamMembers }
      ] = await Promise.all([
        projectsQuery,
        expensesQuery,
        materialsQuery,
        teamMembersQuery
      ]);

      // Calculate financial metrics
      const totalIncome = expenses?.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalExpenses = expenses?.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const netProfit = totalIncome - totalExpenses;
      const activeProjectsCount = allProjects?.filter((p: any) => p.status !== "completed").length || 0;

      // Set stats
      setStats([
        {
          name: "Active Projects",
          value: activeProjectsCount,
          icon: FolderOpen,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          href: "/projects",
          trend: activeProjectsCount > 0 ? "up" : "neutral",
          trendValue: `${activeProjectsCount} active`,
        },
        {
          name: "Net Profit",
          value: formatCurrency(netProfit),
          icon: TrendingUp,
          color: netProfit >= 0 ? "text-green-600" : "text-red-600",
          bgColor: netProfit >= 0 ? "bg-green-100" : "bg-red-100",
          href: "/expenses",
          trend: netProfit >= 0 ? "up" : "down",
          trendValue: netProfit >= 0 ? "Profitable" : "Loss",
        },
        {
          name: "Total Expenses",
          value: formatCurrency(totalExpenses),
          icon: IndianRupee,
          color: "text-red-600",
          bgColor: "bg-red-100",
          href: "/expenses",
          trend: "down",
          trendValue: `${expenses?.filter(e => e.type === 'expense').length || 0} transactions`,
        },
        {
          name: "Materials Stock",
          value: materials?.reduce((sum, m) => sum + (m.qty_required || 0), 0) || 0,
          icon: Package,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          href: "/materials",
          trend: "up",
          trendValue: `${materials?.length || 0} items`,
        },
      ]);

      // Prepare chart data for the selected time period
      const chartDataMap = new Map<string, { income: number; expenses: number }>();
      
      // Initialize all dates in the range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        chartDataMap.set(dateKey, { income: 0, expenses: 0 });
      }

      // Populate with actual data
      expenses?.forEach((expense: any) => {
        const expenseDate = expense.date;
        if (expenseDate >= startDate.toISOString().split('T')[0] && expenseDate <= endDate.toISOString().split('T')[0]) {
          const existing = chartDataMap.get(expenseDate) || { income: 0, expenses: 0 };
          if (expense.type === 'income') {
            existing.income += Number(expense.amount);
          } else {
            existing.expenses += Number(expense.amount);
          }
          chartDataMap.set(expenseDate, existing);
        }
      });

      const chartDataArray: ChartData[] = Array.from(chartDataMap.entries())
        .map(([date, values]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          income: values.income,
          expenses: values.expenses,
          profit: values.income - values.expenses,
        }))
        .slice(-30); // Show last 30 data points

      setChartData(chartDataArray);

      // Project status data
      const statusCounts = allProjects?.reduce((acc: any, project: any) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const projectStatusArray: ProjectStatusData[] = Object.entries(statusCounts).map(([status, count], index) => ({
        name: status || 'Unknown',
        value: count as number,
        color: COLORS[index % COLORS.length],
      }));

      setProjectStatusData(projectStatusArray);

      // Expense categories data
      const categoryTotals = expenses?.filter(e => e.type === 'expense').reduce((acc: any, expense: any) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
      }, {}) || {};

      const totalCategoryExpenses = Object.values(categoryTotals).reduce((sum: number, amount: any) => sum + amount, 0);
      
      const expenseCategoryArray: ExpenseCategoryData[] = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount: amount as number,
          percentage: totalCategoryExpenses > 0 ? ((amount as number) / totalCategoryExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6); // Top 6 categories

      setExpenseCategoryData(expenseCategoryArray);

      // Recent activities
      const recentExpensesQuery = supabase
        .from("expenses")
        .select("id, amount, date, created_at, project_id, created_by, category, type")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const recentMaterialsQuery = supabase
        .from("materials")
        .select("id, name, project_id, created_by, updated_at, qty_required")
        .eq("created_by", user.id)
        .order("updated_at", { ascending: false })
        .limit(5);

      const [
        { data: recentExpenses },
        { data: recentMaterials }
      ] = await Promise.all([
        recentExpensesQuery,
        recentMaterialsQuery
      ]);

      // Get projects for lookup
      const { data: allProjectsForLookup } = await supabase
        .from("projects")
        .select("id, name")
        .eq("created_by", user.id);

      let activities: any[] = [];

      // Add expense/income activities
      recentExpenses?.forEach((transaction: any) => {
        const project = allProjectsForLookup?.find(p => p.id === transaction.project_id);
        activities.push({
          id: `transaction-${transaction.id}`,
          type: transaction.type,
          title: transaction.type === 'income' ? 'Income Received' : 'Expense Recorded',
          description: `${transaction.category} - ${formatCurrency(transaction.amount)} for ${project?.name || 'Unknown Project'}`,
          date: transaction.created_at || transaction.date,
          icon: transaction.type === 'income' ? TrendingUp : TrendingDown,
          color: transaction.type === 'income' ? 'text-green-600' : 'text-red-600',
          bgColor: transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100',
        });
      });

      // Add material activities
      recentMaterials?.forEach((material: any) => {
        const project = allProjectsForLookup?.find(p => p.id === material.project_id);
        activities.push({
          id: `material-${material.id}`,
          type: 'material',
          title: 'Material Added',
          description: `${material.name} (Qty: ${material.qty_required}) for ${project?.name || 'Unknown Project'}`,
          date: material.updated_at,
          icon: Package,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
        });
      });

      // Sort activities by date
      activities = activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);

      setRecentActivities(activities);
      setLoading(false);
    };

    fetchData();
  }, [user, timePeriod]);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Layout title="Dashboard">
        <div className="flex-1">
          {/* Welcome Header - No top margin/padding */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg text-white p-8 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back, {name}!</h1>
                <p className="text-blue-100">Here's what's happening with your projects today.</p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="7" className="text-gray-900">Last 7 days</option>
                  <option value="30" className="text-gray-900">Last 30 days</option>
                  <option value="90" className="text-gray-900">Last 3 months</option>
                  <option value="180" className="text-gray-900">Last 6 months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
              return (
                <Link
                  key={stat.name}
                  to={stat.href}
                  className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 ${stat.bgColor} p-3 rounded-lg`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                      </div>
                      <div className={`flex items-center ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
                        <TrendIcon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500">{stat.trendValue}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Financial Trend Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Financial Trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Profit'
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.6}
                      name=""
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stackId="2"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.6}
                      name=""
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      name=""
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Project Status Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Status</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Expense Categories and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Expense Categories */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Expense Categories</h3>
              <div className="space-y-4">
                {expenseCategoryData.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">{category.category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(category.amount)}</p>
                      <p className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`p-2 rounded-full ${activity.bgColor}`}>
                          <Icon className={`w-5 h-5 ${activity.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(activity.date)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No recent activities found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {role !== "client" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    name: "New Project",
                    description: "Create a new construction project",
                    icon: FolderOpen,
                    href: "/projects",
                    color: "bg-blue-600 hover:bg-blue-700",
                  },
                  {
                    name: "Add Transaction",
                    description: "Record income or expense",
                    icon: IndianRupee,
                    href: "/expenses",
                    color: "bg-green-600 hover:bg-green-700",
                  },
                  {
                    name: "Manage Materials",
                    description: "Update material inventory",
                    icon: Package,
                    href: "/materials",
                    color: "bg-yellow-600 hover:bg-yellow-700",
                  },
                  {
                    name: "View Reports",
                    description: "Generate project reports",
                    icon: FileText,
                    href: "/reports",
                    color: "bg-purple-600 hover:bg-purple-700",
                  },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.name}
                      to={action.href}
                      className={`${action.color} text-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
                    >
                      <Icon className="h-8 w-8 mx-auto mb-2" />
                      <h4 className="font-semibold text-sm">{action.name}</h4>
                      <p className="text-xs opacity-90 mt-1">{action.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Layout>

      {/* Simple Centered Footer */}
      <footer className="">
        <div className="">
          
        </div>
      </footer>
    </div>
  );
}