import React, { useState, useEffect } from "react";
import { Plus, CreditCard as Edit2, Trash2, X, AlertTriangle, Calendar, MapPin, User, File, Camera, DollarSign, TrendingUp, TrendingDown, Search, IndianRupee, BarChart3, List } from "lucide-react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import imageCompression from "browser-image-compression";
import { NotificationService } from "../lib/notificationService";

type Project = { id: string; name: string };

type Phase = {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "Not Started" | "In Progress" | "Completed";
  estimated_cost?: number;
  contractor_name?: string;
  created_by?: string;
};

type Expense = {
  id: string;
  phase_id: string;
  category: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
};

type PhasePhoto = {
  id: string;
  photo_url: string;
  created_at: string;
  uploaded_by: string;
};

type PhaseComment = {
  id: string;
  phase_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
  updated_at: string;
};

export function Phases() {
  const { userRole, user } = useAuth();
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [incomes, setIncomes] = useState<Record<string, Expense[]>>({});
  const [form, setForm] = useState({
    project_id: "",
    name: "",
    start_date: "",
    end_date: "",
    status: "Not Started" as "Not Started" | "In Progress" | "Completed",
    estimated_cost: "",
    contractor_name: "",
  });
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewPhase, setViewPhase] = useState<Phase | null>(null);
  const [phasePhotos, setPhasePhotos] = useState<PhasePhoto[]>([]);
  const [comments, setComments] = useState<PhaseComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoToDelete, setPhotoToDelete] = useState<PhasePhoto | null>(null);
  const [showPhotoDeleteConfirm, setShowPhotoDeleteConfirm] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [timelineFilter, setTimelineFilter] = useState<"All" | "This Month" | "This Year">("All");
  const [creatorInfo, setCreatorInfo] = useState<{ role: string; userName: string } | null>(null);

  const canManage = ["Admin", "Project Manager", "Site Engineer"].includes(
    userRole ?? ""
  );

  // Fetch creator information
  const fetchCreatorInfo = async (createdById: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", createdById)
        .maybeSingle();

      if (!error && profileData) {
        setCreatorInfo({
          role: profileData.role || "Unknown Role",
          userName: profileData.full_name || "Unknown User"
        });
      } else {
        setCreatorInfo({ role: "Unknown Role", userName: "Unknown User" });
      }
    } catch (error) {
      console.error("Error fetching creator info:", error);
      setCreatorInfo({ role: "Unknown Role", userName: "Unknown User" });
    }
  };

  // Function to format dates as DD-MMM-YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper function to get date range for timeline filter
  const getTimelineDateRange = () => {
    const today = new Date('2025-10-13'); // Fixed date as per instructions
    let startDate: Date, endDate: Date;

    if (timelineFilter === "This Month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (timelineFilter === "This Year") {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
    } else {
      // All Time: Find min and max dates from phases
      if (phases.length === 0) {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else {
        const phaseDates = phases
          .flatMap((p) => [
            p.start_date ? new Date(p.start_date) : null,
            p.end_date ? new Date(p.end_date) : null,
          ])
          .filter((date): date is Date => date !== null && !isNaN(date.getTime()));
        if (phaseDates.length === 0) {
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else {
          startDate = new Date(Math.min(...phaseDates.map((d) => d.getTime())));
          endDate = new Date(Math.max(...phaseDates.map((d) => d.getTime())));
          // Add padding to the range
          startDate.setDate(startDate.getDate() - 7);
          endDate.setDate(endDate.getDate() + 7);
        }
      }
    }

    return { startDate, endDate };
  };

  // Fetch user's assigned project first
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      // First try to get user from users table by email or auth_user_id
      let userRecord = null;
      
      // Try by email first
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, project_id')
        .eq('email', user.email)
        .single();
      
      if (userByEmail) {
        userRecord = userByEmail;
      } else {
        // Try by auth_user_id as fallback
        const { data: userByAuthId } = await supabase
          .from('users')
          .select('id, project_id')
          .eq('auth_user_id', user?.id)
          .single();
        
        if (userByAuthId) {
          userRecord = userByAuthId;
        }
      }

      if (userRecord?.id) {
        // Fetch multiple projects from user_projects table
        const { data: userProjects, error: userProjectsError } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', userRecord.id);

        if (!userProjectsError && userProjects && userProjects.length > 0) {
          const projectIds = userProjects.map(up => up.project_id);
          console.log('Phases - Found assigned projects:', projectIds);
          setAssignedProjectIds(projectIds);
        } else if (userRecord.project_id) {
          // Fallback to single project_id for backward compatibility
          console.log('Phases - Using single project_id (backward compatibility):', userRecord.project_id);
          setAssignedProjectIds([userRecord.project_id]);
        } else {
          console.log('Phases - No projects assigned to user');
          setAssignedProjectIds([]);
        }
      } else {
        console.log('Phases - User not found in users table');
        setAssignedProjectIds([]);
      }
    };
    fetchUserData();
  }, [user?.id]);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.id) return;

      let query = supabase
        .from("projects")
        .select("id, name");

      if (userRole === 'Admin') {
        query = query.eq("created_by", user.id);
      } else if (assignedProjectIds.length > 0) {
        query = query.in("id", assignedProjectIds);
      } else {
        setProjects([]);
        return;
      }

      const { data, error } = await query.order("name");
      if (!error) setProjects(data || []);
    };
    fetchProjects();
  }, [user?.id, userRole, assignedProjectIds]);

  // Fetch phases and their expenses
  const fetchPhases = async () => {
    if (!user?.id) return;

    console.log('Phases - fetchPhases called with:', { userRole, assignedProjectIds, userId: user?.id });

    let query = supabase
      .from("phases")
      .select(`id, project_id, name, start_date, end_date, status, estimated_cost, contractor_name`);

    if (userRole === 'Admin') {
      console.log('Phases - Admin user, getting phases from projects they created');
      // For Admin users, get phases from projects they created
      // First get project IDs that the admin created
      const { data: adminProjects, error: projectsError } = await supabase
        .from("projects")
        .select("id")
        .eq("created_by", user.id);
      
      if (projectsError) {
        console.error("Phases - Error fetching admin projects:", projectsError);
        setPhases([]);
        return;
      }
      
      if (!adminProjects || adminProjects.length === 0) {
        console.log('Phases - Admin has no projects, returning empty phases');
        setPhases([]);
        return;
      }
      
      const projectIds = adminProjects.map(p => p.id);
      console.log('Phases - Admin project IDs:', projectIds);
      query = query.in("project_id", projectIds);
    } else if (assignedProjectIds.length > 0) {
      console.log('Phases - Non-admin user, filtering by assigned projects:', assignedProjectIds);
      query = query.in("project_id", assignedProjectIds);
    } else {
      console.log('Phases - No assigned projects, returning empty phases');
      setPhases([]);
      return;
    }

    const { data, error } = await query.order("start_date");

    if (error) {
      console.error("Phases - Error fetching phases:", error.message);
      return;
    }

    console.log('Phases - Raw phases data:', { data, error, dataLength: data?.length });
    if (!data || data.length === 0) {
      console.log('Phases - No phases found');
      setPhases([]);
      return;
    }

    // Get all unique project IDs from phases
    const projectIds = [...new Set(data.map(p => p.project_id))];
    console.log('Phases - Unique project IDs:', projectIds);

    // Fetch project names for all project IDs
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);

    console.log('Phases - Projects data:', { projectsData, projectsError });

    // Create a map of project_id to project_name
    const projectNameMap: Record<string, string> = {};
    if (projectsData) {
      projectsData.forEach(proj => {
        projectNameMap[proj.id] = proj.name;
      });
    }

    console.log('Phases - Project name map:', projectNameMap);

    const mapped: Phase[] = data.map((p: any) => ({
      id: p.id,
      project_id: p.project_id,
      project_name: projectNameMap[p.project_id] || "No Project",
      name: p.name,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      estimated_cost: p.estimated_cost,
      contractor_name: p.contractor_name,
      created_by: undefined, // Column doesn't exist in database
    }));

    console.log("Phases - Mapped phases:", mapped);
    setPhases(mapped);

    // Fetch expenses per phase
    for (const phase of mapped) {
      const { data: allTransactions } = await supabase
        .from("expenses")
        .select("*")
        .eq("phase_id", phase.id);
      
      const transactions = allTransactions || [];
      const expensesData = transactions.filter(t => t.type === 'expense' || !t.type);
      const incomesData = transactions.filter(t => t.type === 'income');
      
      setExpenses((prev) => ({ ...prev, [phase.id]: expensesData }));
      setIncomes((prev) => ({ ...prev, [phase.id]: incomesData }));
    }
  };

  useEffect(() => {
    if (user?.id && (userRole === 'Admin' || assignedProjectIds.length > 0)) {
      fetchPhases();
    }
  }, [user?.id, userRole, assignedProjectIds]);

  // Save phase (create or update)
  const savePhase = async () => {
    if (!form.project_id || !form.name) {
      alert("Please fill in required fields");
      return;
    }

    if (form.end_date <= form.start_date) {
      alert("End date must be after start date");
      return;
    }

    const phaseData = {
      project_id: form.project_id,
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      contractor_name: form.contractor_name || null,
      // created_by column doesn't exist in phases table
    };

    if (editingPhase) {
      await supabase.from("phases").update(phaseData).eq("id", editingPhase.id);
      
      // Create notification for admin
      if (user?.id && form.project_id) {
        await NotificationService.createPhaseNotification(
          user.id,
          form.project_id,
          'phase_updated',
          {
            name: form.name,
            status: form.status,
            estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined
          }
        );
      }
    } else {
      await supabase.from("phases").insert([phaseData]);
      
      // Create notification for admin
      if (user?.id && form.project_id) {
        await NotificationService.createPhaseNotification(
          user.id,
          form.project_id,
          'phase_added',
          {
            name: form.name,
            status: form.status,
            estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined
          }
        );
      }
    }

    setShowModal(false);
    setEditingPhase(null);
    setForm({
      project_id: "",
      name: "",
      start_date: "",
      end_date: "",
      status: "Not Started",
      estimated_cost: "",
      contractor_name: "",
    });
    fetchPhases();
  };

  const deletePhase = async (phase: Phase) => {
    try {
      console.log("Attempting to delete phase:", phase.id);
      
      const { error } = await supabase
        .from("phases")
        .delete()
        .eq("id", phase.id);

      if (error) {
        console.error("Supabase delete error:", error);
        alert(`Failed to delete phase: ${error.message}`);
        return;
      }

      // Create notification for admin
      if (user?.id && phase.project_id) {
        await NotificationService.createPhaseNotification(
          user.id,
          phase.project_id,
          'phase_deleted',
          {
            name: phase.name,
            status: phase.status,
            estimated_cost: phase.estimated_cost
          }
        );
      }

      console.log("Phase deleted successfully from database");
      
      await fetchPhases();
      
      if (selectedPhase?.id === phase.id) {
        setSelectedPhase(null);
      }
      
      if (viewPhase?.id === phase.id) {
        setViewPhase(null);
      }

      setShowDeleteConfirm(false);
      setPhaseToDelete(null);
      alert("Phase deleted successfully!");
      
    } catch (error: any) {
      console.error("Error deleting phase:", error);
      alert(`An error occurred while deleting the phase: ${error.message}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, phase: Phase) => {
    e.stopPropagation();
    setPhaseToDelete(phase);
    setShowDeleteConfirm(true);
  };

  const editPhase = (phase: Phase) => {
    setEditingPhase(phase);
    setForm({
      project_id: phase.project_id,
      name: phase.name,
      start_date: phase.start_date,
      end_date: phase.end_date,
      status: phase.status,
      estimated_cost: phase.estimated_cost?.toString() || "",
      contractor_name: phase.contractor_name || "",
    });
    setShowModal(true);
  };

  const getBudgetUsage = (phase: Phase) => {
    const totalSpent = expenses[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;
    if (!phase.estimated_cost) return 0;
    return Math.round((totalSpent / phase.estimated_cost) * 100);
  };

  // Fetch phase photos
  const fetchPhasePhotos = async (phaseId: string) => {
    const { data, error } = await supabase
      .from("phase_photos")
      .select("id, photo_url, created_at, uploaded_by")
      .eq("phase_id", phaseId)
      .order("created_at", { ascending: false });
    if (!error) setPhasePhotos(data || []);
  };

  // Delete phase photo
  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;

    setDeletingPhoto(true);
    try {
      const url = photoToDelete.photo_url;
      const urlParts = url.split('/phase-photos/');

      if (urlParts.length > 1) {
        const filePath = `phase-photos/${urlParts[1].split('?')[0]}`;
        const { error: storageError } = await supabase.storage
          .from('phase-photos')
          .remove([filePath]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('phase_photos')
        .delete()
        .eq('id', photoToDelete.id);

      if (dbError) {
        throw dbError;
      }

      if (viewPhase) {
        await fetchPhasePhotos(viewPhase.id);
      }

      setShowPhotoDeleteConfirm(false);
      setPhotoToDelete(null);
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    } finally {
      setDeletingPhoto(false);
    }
  };

  // Fetch comments
  const fetchComments = async (phaseId: string) => {
    const { data, error } = await supabase
      .from("phase_comments")
      .select(`id, comment, created_at, updated_at, user_id, profiles!user_id(id, full_name)`)
      .eq("phase_id", phaseId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(
        data.map((c: any) => ({
          id: c.id,
          phase_id: phaseId,
          user_id: c.user_id,
          user_name: c.profiles?.full_name || "Unknown",
          comment: c.comment,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }))
      );
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user || !viewPhase) return;
    await supabase.from("phase_comments").insert([
      { phase_id: viewPhase.id, user_id: user.id, comment: newComment.trim() },
    ]);
    setNewComment("");
    fetchComments(viewPhase.id);
  };

  const updateComment = async (id: string, text: string) => {
    await supabase.from("phase_comments").update({ comment: text }).eq("id", id);
    if (viewPhase) fetchComments(viewPhase.id);
  };

  const removeComment = async (id: string) => {
    await supabase.from("phase_comments").delete().eq("id", id);
    if (viewPhase) fetchComments(viewPhase.id);
  };

  const getHeaderSubtitle = () => {
    if (selectedPhase) {
      return `${selectedPhase.name} - ${selectedPhase.project_name}`;
    }
    return undefined;
  };

  const handleModalClick = (e: React.MouseEvent, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPhases = phases.filter((phase) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      phase.name.toLowerCase().includes(searchLower) ||
      phase.project_name?.toLowerCase().includes(searchLower) ||
      phase.status.toLowerCase().includes(searchLower) ||
      phase.contractor_name?.toLowerCase().includes(searchLower)
    );
    const matchesProject = selectedProjectFilter === "all" || phase.project_id === selectedProjectFilter;
    
    // Apply timeline filter
    if (timelineFilter !== "All" && phase.start_date && phase.end_date) {
      const phaseStart = new Date(phase.start_date);
      const phaseEnd = new Date(phase.end_date);
      const { startDate, endDate } = getTimelineDateRange();
      return matchesSearch && matchesProject && phaseEnd >= startDate && phaseStart <= endDate;
    }
    
    return matchesSearch && matchesProject;
  });

  console.log('Phases - Current state:', { 
    phasesCount: phases.length, 
    filteredPhasesCount: filteredPhases.length,
    searchTerm, 
    selectedProjectFilter, 
    timelineFilter,
    phases: phases.slice(0, 3) // Show first 3 phases for debugging
  });

  const phasesByProject = filteredPhases.reduce((acc, phase) => {
    if (!acc[phase.project_id]) {
      acc[phase.project_id] = {
        projectName: phase.project_name || 'Unknown Project',
        phases: []
      };
    }
    acc[phase.project_id].phases.push(phase);
    return acc;
  }, {} as Record<string, { projectName: string; phases: Phase[] }>);

  // Render Gantt Chart for a single project
  const renderProjectGantt = (projectId: string, projectName: string, projectPhases: Phase[]) => {
    console.log(`Rendering Gantt for project ${projectId}:`, projectPhases);

    const validPhases = projectPhases.filter(phase => {
      const start = new Date(phase.start_date);
      const end = new Date(phase.end_date);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
    });

    if (validPhases.length === 0) {
      console.log(`No valid phases for project ${projectId}`);
      return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">{projectName}</h3>
          <p className="text-gray-500">No valid phase dates available for Gantt chart</p>
        </div>
      );
    }

    // Use timeline filter to set date range
    const { startDate: minDate, endDate: maxDate } = getTimelineDateRange();
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
      console.log(`Invalid total days for project ${projectId}: ${totalDays}`);
      return null;
    }

    const statusColors: Record<string, string> = {
      'Completed': 'bg-green-500',
      'In Progress': 'bg-blue-500',
      'Not Started': 'bg-gray-400',
    };

    return (
      <div key={projectId} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">{projectName}</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[800px] space-y-3 relative">
            {/* Timeline Header */}
            <div className="flex mb-4">
              <div className="w-48 flex-shrink-0"></div>
              <div className="flex-1 relative">
                <div className="flex justify-between text-xs text-slate-600">
                  {[...Array(5)].map((_, i) => {
                    const date = new Date(
                      minDate.getTime() + (i * (maxDate.getTime() - minDate.getTime())) / 4
                    );
                    return <span key={i}>{formatDate(date.toISOString())}</span>;
                  })}
                </div>
              </div>
            </div>
            {/* Gantt Chart Bars */}
            {validPhases.map((phase) => {
              const startDate = new Date(phase.start_date);
              const endDate = new Date(phase.end_date);
              const phaseDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const startOffset = Math.ceil((startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
              const widthPercent = Math.max((phaseDays / totalDays) * 100, 2);
              const leftPercent = (startOffset / totalDays) * 100;

              const totalExpenses = expenses[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;
              const totalIncome = incomes[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;

              console.log(`Phase ${phase.name}: start=${startDate}, end=${endDate}, width=${widthPercent}%, left=${leftPercent}%`);

              return (
                <div key={phase.id} className="group">
                  <div className="flex items-center mb-2">
                    <div className="w-48 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{phase.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                      </p>
                    </div>
                    <div className="flex-1 ml-4 relative">
                      <div className="relative h-10 bg-slate-100 rounded-lg">
                        <div
                          className={`absolute h-full rounded-lg ${
                            statusColors[phase.status] || 'bg-gray-400'
                          } flex items-center justify-center text-white text-xs font-medium transition-all hover:opacity-90 cursor-pointer z-10`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          onClick={() => setSelectedPhase(phase)}
                          title={`${phase.name}: ${formatDate(phase.start_date)} to ${formatDate(phase.end_date)}`}
                        >
                          <span className="truncate px-2">{phase.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                        <span className="flex items-center">
                          <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                          ₹{totalExpenses.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                          ₹{totalIncome.toLocaleString()}
                        </span>
                        {phase.contractor_name && (
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {phase.contractor_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Today Line */}
            {(() => {
              const today = new Date('2025-10-13');
              if (today >= minDate && today <= maxDate) {
                const offsetDays = Math.ceil((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                const leftPercent = (offsetDays / totalDays) * 100;
                return (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-20"
                    style={{ left: `calc(${leftPercent}% + 12rem)` }}
                  >
                    <div className="absolute top-0 -translate-x-1/2 bg-red-600 text-white text-xs px-1 py-0.5 rounded">
                      Today
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-slate-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-slate-600">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-slate-600">Not Started</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout title="Phases" subtitle={getHeaderSubtitle()}>
      {/* Show helpful message when no project is assigned */}
      {userRole !== 'Admin' && assignedProjectIds.length === 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">No Project Assigned</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You don't have a project assigned. Please contact your administrator to assign you to a project.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-1" /> Create Phase
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'gantt'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Gantt Chart View"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline Filter */}
          {viewMode === 'gantt' && (
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value as "All" | "This Month" | "This Year")}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="All">All Time</option>
              <option value="This Month">This Month</option>
              <option value="This Year">This Year</option>
            </select>
          )}

          {/* Project Filter */}
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="flex-1 relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search phases"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Gantt Chart View */}
        {viewMode === 'gantt' ? (
          <div>
            {filteredPhases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || selectedProjectFilter !== 'all' || timelineFilter !== 'All'
                  ? 'No phases found matching your filters'
                  : 'No phases available'}
              </div>
            ) : (
              <div>
                {Object.entries(phasesByProject).map(([projectId, { projectName, phases }]) =>
                  renderProjectGantt(projectId, projectName, phases)
                )}
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredPhases.length === 0 && (searchTerm || selectedProjectFilter !== 'all') && (
              <div className="text-center py-8 text-gray-500">
                No phases found matching your filters
              </div>
            )}
            {filteredPhases.map((phase) => {
              const totalExpenses = expenses[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;
              const totalIncome = incomes[phase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0;

              return (
                <div
                  key={phase.id}
                  className={`border rounded-lg shadow-sm cursor-pointer transition-all ${
                    selectedPhase?.id === phase.id
                      ? "border-blue-500 bg-blue-50"
                      : "hover:border-gray-300 hover:shadow-md"
                  }`}
                  onClick={() => setSelectedPhase(phase)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900">{phase.name}</h2>
                        <p className="text-sm text-gray-500 mb-1">
                          Project: {phase.project_name}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(phase.start_date)} → {formatDate(phase.end_date)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(phase.status)}`}>
                            {phase.status}
                          </span>
                        </div>
                        {phase.contractor_name && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            Contractor: {phase.contractor_name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedPhase(phase);
                            setViewPhase(phase);
                            fetchPhasePhotos(phase.id);
                            fetchComments(phase.id);
                            // Note: created_by column doesn't exist in phases table
                            // Creator info feature disabled
                          }}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          View Details
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                editPhase(phase);
                              }}
                              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(e, phase)}
                              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Budget</span>
                          <DollarSign className="w-4 h-4 text-gray-500" />
                        </div>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          ₹{phase.estimated_cost?.toLocaleString() || '0'}
                        </p>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-700">Income</span>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          ₹{totalIncome.toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {incomes[phase.id]?.length || 0} transactions
                        </p>
                      </div>

                      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-red-700">Expenses</span>
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        </div>
                        <p className="text-lg font-bold text-red-600 mt-1">
                          ₹{totalExpenses.toLocaleString()}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {expenses[phase.id]?.length || 0} transactions
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700">Total Spent</span>
                          <DollarSign className="w-4 h-4 text-gray-600" />
                        </div>
                        <p className="text-lg font-bold mt-1 text-red-600">
                          ₹{totalExpenses.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Total Spent
                        </p>
                      </div>
                    </div>

                    {/* Budget Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">Budget Usage</span>
                        <span className={`text-xs font-semibold ${getBudgetUsage(phase) > 100 ? 'text-red-600' : 'text-gray-900'}`}>
                          {getBudgetUsage(phase)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            getBudgetUsage(phase) > 100 ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(getBudgetUsage(phase), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => handleModalClick(e, () => setShowModal(false))}
          >
            <div className="bg-white p-6 rounded-lg w-full max-w-md z-50">
              <h2 className="text-xl font-semibold mb-4">
                {editingPhase ? "Edit Phase" : "Create New Phase"}
              </h2>

              <label className="block text-sm mb-1 font-medium">Project</label>
              <select
                className="border p-2 rounded w-full mb-3"
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Phase Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <label className="block text-sm mb-1 font-medium">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <label className="block text-sm mb-1 font-medium">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Phase["status"] })
                }
                className="border p-2 rounded w-full mb-3"
              >
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>

              <input
                type="number"
                placeholder="Estimated Cost (₹)"
                value={form.estimated_cost}
                onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <input
                type="text"
                placeholder="Contractor Name"
                value={form.contractor_name}
                onChange={(e) => setForm({ ...form, contractor_name: e.target.value })}
                className="border p-2 rounded w-full mb-3"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={savePhase}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Save Phase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Phase Details Modal */}
        {viewPhase && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
            onClick={(e) => handleModalClick(e, () => setViewPhase(null))}
          >
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto z-40">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Phase Details</h2>
                <button 
                  onClick={() => {
                    setViewPhase(null);
                    setCreatorInfo(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{viewPhase.name}</h1>
                  <div className="flex items-center justify-center text-gray-600 mb-4">
                    <File className="w-5 h-5 mr-2" />
                    <span>Project: {viewPhase.project_name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-1">Status</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewPhase.status)}`}>
                      {viewPhase.status}
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-1">Start Date</h3>
                    <p className="text-gray-900 font-medium">
                      {viewPhase.start_date ? formatDate(viewPhase.start_date) : 'Not set'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-1">End Date</h3>
                    <p className="text-gray-900 font-medium">
                      {viewPhase.end_date ? formatDate(viewPhase.end_date) : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <IndianRupee className="w-6 h-6 text-blue-600 mr-2" />
                    <h3 className="text-xl font-bold text-gray-900">Budget Overview</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Total Budget</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{viewPhase.estimated_cost?.toLocaleString() || '0'}
                      </p>
                    </div>

                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Budget Used</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        ₹{(expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Remaining</h4>
                      <p className={`text-2xl font-bold ${
                        viewPhase.estimated_cost && 
                        (viewPhase.estimated_cost - 
                         ((expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                          (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0))) >= 0
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{viewPhase.estimated_cost ? 
                          (viewPhase.estimated_cost - 
                           ((expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                            (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0))
                          ).toLocaleString() : '0'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-gray-900">{getBudgetUsage(viewPhase)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          getBudgetUsage(viewPhase) > 100 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(getBudgetUsage(viewPhase), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <IndianRupee className="w-6 h-6 text-green-600 mr-2" />
                    <h3 className="text-xl font-bold text-gray-900">Financial Overview</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg p-4 text-center border border-green-200">
                      <div className="flex items-center justify-center mb-2">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Total Income</h4>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{(incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {incomes[viewPhase.id]?.length || 0} transactions
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 text-center border border-red-200">
                      <div className="flex items-center justify-center mb-2">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Total Expenses</h4>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{(expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {expenses[viewPhase.id]?.length || 0} transactions
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                      <div className="flex items-center justify-center mb-2">
                        <IndianRupee className="w-6 h-6 text-gray-600" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Net Amount</h4>
                      <p className={`text-2xl font-bold ${
                        (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                        (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) >= 0 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                         (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) >= 0 ? '+' : '-'}
                        ₹{Math.abs(
                          (incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                          (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0)
                        ).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(incomes[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) - 
                         (expenses[viewPhase.id]?.reduce((sum, e) => sum + e.amount, 0) || 0) >= 0 ? 'Profit' : 'Loss'}
                      </p>
                    </div>
                  </div>
                </div>

                {viewPhase.contractor_name && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-600 mr-2" />
                      <span className="font-medium text-gray-700">Contractor:</span>
                      <span className="ml-2 text-gray-900">{viewPhase.contractor_name}</span>
                    </div>
                  </div>
                )}

                {/* Creator Information */}
                {creatorInfo && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 mb-1">Created By</p>
                    <p className="text-base font-semibold text-gray-900">
                      {creatorInfo.role}: {creatorInfo.userName}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Camera className="w-6 h-6 text-gray-600 mr-2" />
                      <h3 className="text-xl font-bold text-gray-900">Phase Photos</h3>
                    </div>
                    {canManage && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          if (!e.target.files || !user) return;
                          const file = e.target.files[0];
                          const compressed = await imageCompression(file, { maxSizeMB: 1 });
                          const filePath = `phase-photos/${viewPhase.id}/${Date.now()}-${file.name}`;
                          const { error } = await supabase.storage
                            .from("phase-photos")
                            .upload(filePath, compressed);
                          if (error) return alert(error.message);
                          const { data } = supabase.storage.from("phase-photos").getPublicUrl(filePath);
                          await supabase.from("phase_photos").insert([
                            { phase_id: viewPhase.id, project_id: viewPhase.project_id, uploaded_by: user.id, photo_url: data.publicUrl }
                          ]);
                          fetchPhasePhotos(viewPhase.id);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {phasePhotos.map((p) => (
                      <div
                        key={p.id}
                        className="relative rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow group"
                      >
                        <img
                          src={p.photo_url}
                          alt="Phase"
                          className="w-full h-32 object-cover rounded-lg cursor-pointer"
                          onClick={() => setFullScreenImage(p.photo_url)}
                        />
                        {canManage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToDelete(p);
                              setShowPhotoDeleteConfirm(true);
                            }}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-lg"
                            title="Delete photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {phasePhotos.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No photos uploaded yet</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Comments</h3>
                  <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <User className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="font-medium text-gray-900">{c.user_name}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {formatDate(c.created_at)}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={c.comment}
                              onChange={(e) => updateComment(c.id, e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-gray-700 focus:outline-none focus:ring-0"
                              readOnly={user?.id !== c.user_id}
                            />
                          </div>
                          {user?.id === c.user_id && (
                            <button
                              onClick={() => removeComment(c.id)}
                              className="text-red-600 hover:text-red-700 ml-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={addComment}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-3 pt-6 border-t">
                    <button
                      onClick={() => editPhase(viewPhase)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Phase
                    </button>
                    <button
                      onClick={() => handleDeleteClick({} as React.MouseEvent, viewPhase)}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Phase
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && phaseToDelete && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => handleModalClick(e, () => {
              setShowDeleteConfirm(false);
              setPhaseToDelete(null);
            })}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Delete Phase</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the phase "{phaseToDelete.name}"? 
                  This action will also delete all associated expenses, photos, and comments. 
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPhaseToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deletePhase(phaseToDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Phase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Photo Delete Confirmation Modal */}
        {showPhotoDeleteConfirm && photoToDelete && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPhotoDeleteConfirm(false);
                setPhotoToDelete(null);
              }
            }}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Delete Photo</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this photo? This action cannot be undone.
                </p>
                <div className="mt-4 flex justify-center">
                  <img
                    src={photoToDelete.photo_url}
                    alt="Photo to delete"
                    className="max-w-full h-32 object-cover rounded-lg border-2 border-red-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPhotoDeleteConfirm(false);
                    setPhotoToDelete(null);
                  }}
                  disabled={deletingPhoto}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePhoto}
                  disabled={deletingPhoto}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deletingPhoto ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Image */}
        {fullScreenImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
            onClick={() => setFullScreenImage(null)}
          >
            <img
              src={fullScreenImage}
              alt="fullscreen phase"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>

    </Layout>
  );
}