import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  FolderOpen, 
  Package, 
  Users, 
  IndianRupee, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Activity, 
  BarChart3, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Building2,
  Hammer,
  Truck,
  Wrench,
  Filter,
  Search,
  Eye,
  Target,
  Zap
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

interface ChartData {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

interface ExpenseCategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ProjectPhaseData {
  phase: string;
  count: number;
  color: string;
}

interface MaterialStatusData {
  status: string;
  count: number;
  value: number;
}

interface ProjectAnalyticsData {
  projectId: string;
  projectName: string;
  totalPhases: number;
  completedPhases: number;
  activePhases: number;
  totalBudget: number;
  spentAmount: number;
  efficiency: number;
  timeline: string;
  status: string;
}

interface MaterialTrackingData {
  materialId: string;
  name: string;
  category: string;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  totalValue: number;
  status: string;
  lastUpdated: string;
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('30');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<ExpenseCategoryData[]>([]);
  const [projectPhaseData, setProjectPhaseData] = useState<ProjectPhaseData[]>([]);
  const [materialStatusData, setMaterialStatusData] = useState<MaterialStatusData[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [projectProgress, setProjectProgress] = useState<any[]>([]);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalyticsData[]>([]);
  const [materialTracking, setMaterialTracking] = useState<MaterialTrackingData[]>([]);
  const [financialReports, setFinancialReports] = useState<any>({});
  const { user, userRole } = useAuth();

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
      if (!user) {
        console.log("No user found");
        return;
      }

      console.log("Fetching data for user:", user.id);

      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(timePeriod));

        // Fetch user profile first to get the correct admin/user relationship
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq('id', user.id)
          .single();

        console.log("Profile:", profile, "Error:", profileError);

        // Determine which user_id to filter by
        // If this user created other users, show their data too
        let userIds = [user.id];
        
        // If Admin role, optionally show sub-users data (users they created)
        if (userRole === 'Admin' && profile?.id) {
          const { data: subUsers } = await supabase
            .from("profiles")
            .select("id")
            .eq('created_by', profile.id);
          
          if (subUsers && subUsers.length > 0) {
            userIds = [user.id, ...subUsers.map(u => u.id)];
          }
        }

        console.log("Filtering by user IDs:", userIds);

        // Fetch all data with proper filtering
        // Using 'created_by' as per your schema
        const [
          { data: projects, error: projectsError },
          { data: expenses, error: expensesError },
          { data: materials, error: materialsError },
          { data: phases, error: phasesError },
        ] = await Promise.all([
          supabase.from("projects").select("*").in('created_by', userIds),
          supabase.from("expenses").select("*, phases(name, project_id)").in('created_by', userIds),
          supabase.from("materials").select("*").in('created_by', userIds),
          supabase.from("phases").select("*")
        ]);

        console.log("Projects:", projects?.length, "Error:", projectsError);
        console.log("Expenses:", expenses?.length, "Error:", expensesError);
        console.log("Materials:", materials?.length, "Error:", materialsError);
        console.log("Phases:", phases?.length, "Error:", phasesError);

        // If no data, try without filtering (for debugging)
        if (!projects || projects.length === 0) {
          console.log("No projects found with user_id filter, checking all projects...");
          const { data: allProjects } = await supabase.from("projects").select("*").limit(5);
          console.log("Sample projects:", allProjects);
        }

        const userProjectIds = projects?.map(p => p.id) || [];
        const userPhases = phases?.filter(p => userProjectIds.includes(p.project_id)) || [];

        console.log("User project IDs:", userProjectIds);
        console.log("Filtered phases:", userPhases?.length);

        const totalProjects = projects?.length || 0;
        const activeProjects = projects?.filter(p => p.status === 'active')?.length || 0;
        const completedProjects = projects?.filter(p => p.status === 'completed')?.length || 0;
        
        const totalIncome = expenses?.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
        const totalExpenses = expenses?.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
        const netProfit = totalIncome - totalExpenses;
        
        const totalMaterials = materials?.length || 0;
        const pendingMaterials = materials?.filter(m => m.status === 'pending')?.length || 0;
        
        const totalPhases = userPhases?.length || 0;
        const activePhases = userPhases?.filter(p => p.status === 'active')?.length || 0;

        setStats([
          {
            name: "Total Projects",
            value: totalProjects,
            subValue: `${activeProjects} active`,
            icon: FolderOpen,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
            href: "/projects",
            trend: activeProjects > completedProjects ? "up" : "neutral",
            trendValue: `${totalProjects > 0 ? ((activeProjects / totalProjects) * 100).toFixed(0) : 0}% active`,
          },
          {
            name: "Net Profit",
            value: formatCurrency(netProfit),
            subValue: `${formatCurrency(totalIncome)} income`,
            icon: netProfit >= 0 ? TrendingUp : TrendingDown,
            color: netProfit >= 0 ? "text-green-600" : "text-red-600",
            bgColor: netProfit >= 0 ? "bg-green-100" : "bg-red-100",
            href: "/expenses",
            trend: netProfit >= 0 ? "up" : "down",
            trendValue: netProfit >= 0 ? "Profitable" : "Loss",
          },
          {
            name: "Total Expenses",
            value: formatCurrency(totalExpenses),
            subValue: `${expenses?.filter(e => e.type === 'expense').length || 0} transactions`,
            icon: IndianRupee,
            color: "text-red-600",
            bgColor: "bg-red-100",
            href: "/expenses",
            trend: "down",
            trendValue: `${expenses?.filter(e => e.type === 'expense' && new Date(e.date) >= startDate).length || 0} this period`,
          },
          {
            name: "Materials",
            value: totalMaterials,
            subValue: `${pendingMaterials} pending`,
            icon: Package,
            color: "text-yellow-600",
            bgColor: "bg-yellow-100",
            href: "/materials",
            trend: pendingMaterials > 0 ? "up" : "neutral",
            trendValue: `${totalMaterials > 0 ? ((pendingMaterials / totalMaterials) * 100).toFixed(0) : 0}% pending`,
          },
          {
            name: "Active Phases",
            value: activePhases,
            subValue: `${totalPhases} total phases`,
            icon: Hammer,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
            href: "/phases",
            trend: "up",
            trendValue: `${totalPhases > 0 ? ((activePhases / totalPhases) * 100).toFixed(0) : 0}% active`,
          },
        ]);

        const chartDataMap = new Map<string, { income: number; expenses: number }>();
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0];
          chartDataMap.set(dateKey, { income: 0, expenses: 0 });
        }

        expenses?.forEach((expense: any) => {
          const expenseDate = expense.date;
          if (expenseDate >= startDate.toISOString().split('T')[0] && expenseDate <= endDate.toISOString().split('T')[0]) {
            const existing = chartDataMap.get(expenseDate) || { income: 0, expenses: 0 };
            if (expense.type === 'income') {
              existing.income += Number(expense.amount || 0);
            } else {
              existing.expenses += Number(expense.amount || 0);
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
          .slice(-30);

        setChartData(chartDataArray);

        const categoryTotals = expenses?.filter(e => e.type === 'expense').reduce((acc: any, expense: any) => {
          const category = expense.category || 'Uncategorized';
          acc[category] = (acc[category] || 0) + Number(expense.amount || 0);
          return acc;
        }, {}) || {};

        const totalCategoryExpenses = Object.values(categoryTotals).reduce((sum: number, amount: any) => sum + amount, 0);
        
        const expenseCategoryArray: ExpenseCategoryData[] = Object.entries(categoryTotals)
          .map(([category, amount], index) => ({
            category,
            amount: amount as number,
            percentage: totalCategoryExpenses > 0 ? ((amount as number) / totalCategoryExpenses) * 100 : 0,
            color: COLORS[index % COLORS.length],
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 6);

        setExpenseCategoryData(expenseCategoryArray);

        const projectAnalyticsArray: ProjectAnalyticsData[] = projects?.map(project => {
          const projectPhases = userPhases?.filter(p => p.project_id === project.id) || [];
          const projectExpenses = expenses?.filter(e => e.phases?.project_id === project.id) || [];
          
          const totalPhases = projectPhases.length;
          const completedPhases = projectPhases.filter(p => p.status === 'completed').length;
          const activePhases = projectPhases.filter(p => p.status === 'active').length;
          
          const totalBudget = projectPhases.reduce((sum, p) => sum + Number(p.estimated_cost || 0), 0);
          const spentAmount = projectExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount || 0), 0);
          
          const efficiency = totalBudget > 0 ? ((totalBudget - spentAmount) / totalBudget) * 100 : 0;
          
          return {
            projectId: project.id,
            projectName: project.name,
            totalPhases,
            completedPhases,
            activePhases,
            totalBudget,
            spentAmount,
            efficiency: Math.max(0, efficiency),
            timeline: `${formatDate(project.start_date || project.created_at)} - ${project.end_date ? formatDate(project.end_date) : 'Ongoing'}`,
            status: project.status,
          };
        }) || [];

        setProjectAnalytics(projectAnalyticsArray);

        const materialTrackingArray: MaterialTrackingData[] = materials?.map(material => ({
          materialId: material.id,
          name: material.name,
          category: material.category || 'General',
          totalQuantity: Number(material.qty_required || 0),
          usedQuantity: Number(material.qty_used || 0),
          remainingQuantity: Number(material.qty_required || 0) - Number(material.qty_used || 0),
          unitCost: Number(material.unit_cost || 0),
          totalValue: Number(material.unit_cost || 0) * Number(material.qty_required || 0),
          status: material.status || 'pending',
          lastUpdated: material.updated_at || material.created_at,
        })) || [];

        setMaterialTracking(materialTrackingArray);

        const monthlyData = expenses?.reduce((acc: any, expense: any) => {
          const month = new Date(expense.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (!acc[month]) {
            acc[month] = { income: 0, expenses: 0, transactions: 0 };
          }
          if (expense.type === 'income') {
            acc[month].income += Number(expense.amount || 0);
          } else {
            acc[month].expenses += Number(expense.amount || 0);
          }
          acc[month].transactions += 1;
          return acc;
        }, {}) || {};

        setFinancialReports({
          monthlyData,
          totalIncome,
          totalExpenses,
          netProfit,
          avgMonthlyIncome: Object.keys(monthlyData).length > 0 ? totalIncome / Object.keys(monthlyData).length : 0,
          avgMonthlyExpenses: Object.keys(monthlyData).length > 0 ? totalExpenses / Object.keys(monthlyData).length : 0,
        });

        const phaseStatusCounts = userPhases?.reduce((acc: any, phase: any) => {
          const status = phase.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}) || {};

        const projectPhaseArray: ProjectPhaseData[] = Object.entries(phaseStatusCounts).map(([status, count], index) => ({
          phase: status,
          count: count as number,
          color: COLORS[index % COLORS.length],
        }));

        setProjectPhaseData(projectPhaseArray);

        const materialStatusCounts = materials?.reduce((acc: any, material: any) => {
          const status = material.status || 'unknown';
          acc[status] = acc[status] || { count: 0, value: 0 };
          acc[status].count += 1;
          acc[status].value += Number(material.unit_cost || 0) * Number(material.qty_required || 0);
          return acc;
        }, {}) || {};

        const materialStatusArray: MaterialStatusData[] = Object.entries(materialStatusCounts).map(([status, data]: [string, any]) => ({
          status,
          count: data.count,
          value: data.value,
        }));

        setMaterialStatusData(materialStatusArray);

        const upcomingDeadlinesArray = userPhases?.filter(phase => {
          if (!phase.end_date) return false;
          const endDate = new Date(phase.end_date);
          const now = new Date();
          const daysUntilDeadline = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDeadline >= 0 && daysUntilDeadline <= 30;
        })
        .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
        .slice(0, 5) || [];

        setUpcomingDeadlines(upcomingDeadlinesArray);

        const projectProgressArray = projects?.map(project => {
          const projectPhases = userPhases?.filter(p => p.project_id === project.id) || [];
          const completedPhases = projectPhases.filter(p => p.status === 'completed').length;
          const totalPhases = projectPhases.length;
          const progress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;
          
          return {
            ...project,
            progress,
            completedPhases,
            totalPhases,
          };
        }).slice(0, 5) || [];

        setProjectProgress(projectProgressArray);

        const recentExpenses = expenses?.slice(0, 3).map(expense => ({
          id: `expense-${expense.id}`,
          type: expense.type,
          title: expense.type === 'income' ? 'Payment Received' : 'Expense Added',
          description: `${expense.category} - ${formatCurrency(Number(expense.amount || 0))}${expense.phases?.name ? ` for ${expense.phases.name}` : ''}`,
          date: expense.created_at || expense.date,
          icon: expense.type === 'income' ? TrendingUp : TrendingDown,
          color: expense.type === 'income' ? 'text-green-600' : 'text-red-600',
          bgColor: expense.type === 'income' ? 'bg-green-100' : 'bg-red-100',
          tags: expense.tags || [],
        })) || [];

        const recentMaterials = materials?.slice(0, 2).map(material => ({
          id: `material-${material.id}`,
          type: 'material',
          title: 'Material Updated',
          description: `${material.name} - Qty: ${material.qty_required || 0}`,
          date: material.updated_at || material.created_at,
          icon: Package,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          tags: [],
        })) || [];

        const allActivities = [...recentExpenses, ...recentMaterials]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        setRecentActivities(allActivities);
        setLoading(false);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userRole, timePeriod]);

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="flex items-center space-x-1">
                  {stat.trend === "up" && <ArrowUpRight className="w-4 h-4 text-green-500" />}
                  {stat.trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-xs text-gray-500">{stat.subValue}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Income</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Expenses</span>
              </div>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'income' ? 'Income' : 'Expenses'
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="income" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Expense Categories</h3>
          
          {expenseCategoryData.length > 0 ? (
            <>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={expenseCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {expenseCategoryData.slice(0, 4).map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{category.category}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No expense data available</p>
          )}
        </div>

        <div className="col-span-6 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Progress</h3>
          <div className="space-y-4">
            {projectProgress.length > 0 ? (
              projectProgress.map((project) => (
                <div key={project.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{project.name}</span>
                    <span className="text-sm text-gray-500">
                      {project.completedPhases}/{project.totalPhases} phases
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{project.progress.toFixed(0)}% complete</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                      project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No projects available</p>
            )}
          </div>
        </div>

        <div className="col-span-6 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((phase) => {
                const daysUntilDeadline = Math.ceil((new Date(phase.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={phase.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
                    <div className={`p-2 rounded-lg ${
                      daysUntilDeadline <= 3 ? 'bg-red-100' :
                      daysUntilDeadline <= 7 ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <Clock className={`w-4 h-4 ${
                        daysUntilDeadline <= 3 ? 'text-red-600' :
                        daysUntilDeadline <= 7 ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{phase.name}</p>
                      <p className="text-sm text-gray-500">
                        Due {formatDate(phase.end_date)} ({daysUntilDeadline} days)
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      phase.status === 'completed' ? 'bg-green-100 text-green-800' :
                      phase.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {phase.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming deadlines</p>
            )}
          </div>
        </div>

        <div className="col-span-8 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50">
                    <div className={`p-2 rounded-lg ${activity.bgColor} flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      {activity.tags && activity.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {activity.tags.map((tag: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            )}
          </div>
        </div>

        <div className="col-span-4 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Material Status</h3>
          <div className="space-y-4">
            {materialStatusData.length > 0 ? (
              materialStatusData.map((status, index) => (
                <div key={status.status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{status.status}</p>
                      <p className="text-sm text-gray-500">{status.count} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(status.value)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No materials available</p>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderProjectAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Project Performance Analytics</h3>
        </div>

        <div className="overflow-x-auto">
          {projectAnalytics.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Project</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Progress</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Budget vs Spent</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Efficiency</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Timeline</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {projectAnalytics.map((project) => (
                  <tr key={project.projectId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{project.projectName}</div>
                      <div className="text-sm text-gray-500">{project.totalPhases} phases</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${project.totalPhases > 0 ? (project.completedPhases / project.totalPhases) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {project.completedPhases}/{project.totalPhases}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{formatCurrency(project.totalBudget)}</div>
                        <div className="text-red-600">-{formatCurrency(project.spentAmount)}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Target className={`w-4 h-4 ${project.efficiency > 80 ? 'text-green-600' : project.efficiency > 60 ? 'text-yellow-600' : 'text-red-600'}`} />
                        <span className={`font-medium ${project.efficiency > 80 ? 'text-green-600' : project.efficiency > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {project.efficiency.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{project.timeline}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        project.status === 'completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-8">No project analytics available</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Phase Distribution</h3>
          {projectPhaseData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={projectPhaseData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ phase, count }) => `${phase}: ${count}`}
                  >
                    {projectPhaseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No phase data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Efficiency Metrics</h3>
          <div className="space-y-4">
            {projectAnalytics.length > 0 ? (
              projectAnalytics.slice(0, 5).map((project) => (
                <div key={project.projectId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{project.projectName}</p>
                    <p className="text-sm text-gray-500">Budget Efficiency</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className={`w-4 h-4 ${project.efficiency > 80 ? 'text-green-600' : project.efficiency > 60 ? 'text-yellow-600' : 'text-red-600'}`} />
                    <span className={`font-semibold ${project.efficiency > 80 ? 'text-green-600' : project.efficiency > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {project.efficiency.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No efficiency metrics available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancialReports = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(financialReports.totalIncome || 0)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(financialReports.totalExpenses || 0)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Profit</p>
              <p className={`text-2xl font-bold ${financialReports.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financialReports.netProfit || 0)}
              </p>
            </div>
            <IndianRupee className={`w-8 h-8 ${financialReports.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Monthly</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(financialReports.avgMonthlyIncome || 0)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Financial Trend</h3>
        </div>
        
        {financialReports.monthlyData && Object.keys(financialReports.monthlyData).length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Object.entries(financialReports.monthlyData || {}).map(([month, data]: [string, any]) => ({
                month,
                income: data.income,
                expenses: data.expenses,
                profit: data.income - data.expenses,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No financial data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Expense Categories</h3>
          {expenseCategoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No expense categories available</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Category Breakdown</h3>
          <div className="space-y-4">
            {expenseCategoryData.length > 0 ? (
              expenseCategoryData.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900">{category.category}</p>
                      <p className="text-sm text-gray-500">{category.percentage.toFixed(1)}% of total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(category.amount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No category breakdown available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMaterialTracking = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Material Inventory Tracking</h3>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4 mr-2 inline" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {materialTracking.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Material</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Quantity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Usage</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Unit Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Value</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {materialTracking.map((material) => (
                  <tr key={material.materialId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{material.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {material.category}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{material.totalQuantity}</div>
                        <div className="text-gray-500">Total Required</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${material.totalQuantity > 0 ? (material.usedQuantity / material.totalQuantity) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {material.usedQuantity}/{material.totalQuantity}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{formatCurrency(material.unitCost)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900">{formatCurrency(material.totalValue)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        material.status === 'completed' ? 'bg-green-100 text-green-800' :
                        material.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        material.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {material.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600">{formatDate(material.lastUpdated)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-8">No material tracking data available</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Material Status Distribution</h3>
          {materialStatusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={materialStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {materialStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No material status data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Material Value by Status</h3>
          <div className="space-y-4">
            {materialStatusData.length > 0 ? (
              materialStatusData.map((status, index) => (
                <div key={status.status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{status.status}</p>
                      <p className="text-sm text-gray-500">{status.count} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(status.value)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No material value data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

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
    <Layout title="Dashboard">
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-8">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`font-medium border-b-2 pb-2 transition-colors ${
                  activeTab === 'overview' 
                    ? 'text-blue-600 border-blue-600' 
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`font-medium border-b-2 pb-2 transition-colors ${
                  activeTab === 'analytics' 
                    ? 'text-blue-600 border-blue-600' 
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Project Analytics
              </button>
              <button 
                onClick={() => setActiveTab('financial')}
                className={`font-medium border-b-2 pb-2 transition-colors ${
                  activeTab === 'financial' 
                    ? 'text-blue-600 border-blue-600' 
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Financial Reports
              </button>
              <button 
                onClick={() => setActiveTab('materials')}
                className={`font-medium border-b-2 pb-2 transition-colors ${
                  activeTab === 'materials' 
                    ? 'text-blue-600 border-blue-600' 
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Material Tracking
              </button>
            </div>

          </div>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'analytics' && renderProjectAnalytics()}
        {activeTab === 'financial' && renderFinancialReports()}
        {activeTab === 'materials' && renderMaterialTracking()}
      </div>
    </Layout>
  );
}