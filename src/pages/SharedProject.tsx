import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Lock, AlertTriangle, Calendar, MapPin, User, File, Camera, MessageCircle, Send } from 'lucide-react';

interface ShareData {
  id: string;
  project_id: string;
  share_type: 'public' | 'private';
  password: string | null;
  expires_at: string;
  share_options: {
    expenseDetails: boolean;
    phaseDetails: boolean;
    materialsDetails: boolean;
    incomeDetails: boolean;
    phasePhotos: boolean;
    teamMembers: boolean;
    allowComments: boolean;
  };
  is_active: boolean;
  view_count: number; // Added to match project_shares table
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: string;
  location: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface ShareComment {
  id: string;
  comment: string;
  author_name: string;
  created_at: string;
}

export function SharedProject() {
  const { shareId } = useParams<{ shareId: string }>();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [income, setIncome] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [phasePhotos, setPhasePhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<ShareComment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [, setAuthenticated] = useState(false);

  // Comment-related state
  const [newComment, setNewComment] = useState('');
  const [commentAuthorName, setCommentAuthorName] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // UUID validation regex
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  useEffect(() => {
    if (shareId) {
      if (!isValidUUID(shareId)) {
        console.error('Invalid shareId format:', shareId);
        setError('Invalid share link');
        setLoading(false);
        return;
      }
      fetchShareData();
    }
  }, [shareId]);

  useEffect(() => {
    if (projectData) {
      const currentUrl = window.location.href;
      const title = `${projectData.name} - Shared Project | Buildmyhomes`;
      const description = projectData.description || `View shared construction project: ${projectData.name} in ${projectData.location || 'N/A'}`;

      document.title = title;

      updateMetaTag('og:title', title);
      updateMetaTag('og:description', description);
      updateMetaTag('og:url', currentUrl);
      updateMetaTag('description', description);
      updateMetaTag('twitter:title', title);
      updateMetaTag('twitter:description', description);
    }
  }, [projectData]);

  const updateMetaTag = (property: string, content: string) => {
    const isOgTag = property.startsWith('og:');
    const isTwitterTag = property.startsWith('twitter:');
    const selector = isOgTag || isTwitterTag ? `meta[property="${property}"]` : `meta[name="${property}"]`;

    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement('meta');
      if (isOgTag || isTwitterTag) {
        meta.setAttribute('property', property);
      } else {
        meta.setAttribute('name', property);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  const fetchShareData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching share data for shareId:', shareId); // Debug log

      // Fetch share data
      const { data: shareInfo, error: shareError } = await supabase
        .from('project_shares')
        .select('id, project_id, created_at, expires_at, share_type, password, share_options, is_active, view_count')
        .eq('id', shareId)
        .eq('is_active', true)
        .single();

      if (shareError || !shareInfo) {
        console.error('Share fetch error:', shareError);
        setError('Share link not found or has expired');
        setLoading(false);
        return;
      }

      // Check if link has expired
      const now = new Date();
      const expiresAt = new Date(shareInfo.expires_at);
      if (now > expiresAt) {
        setError('This share link has expired');
        setLoading(false);
        return;
      }

      // Increment view count
      const { error: viewError } = await supabase.rpc('increment_share_view_count', { share_id: shareId });
      if (viewError) {
        console.error('Error incrementing view count:', viewError);
      } else {
        console.log('View count incremented for shareId:', shareId);
      }

      setShareData(shareInfo);

      // Check if password is required
      if (shareInfo.share_type === 'private' && shareInfo.password) {
        setPasswordRequired(true);
        setLoading(false);
        return;
      }

      // If no password required or already authenticated, fetch project data
      await fetchProjectData(shareInfo);
    } catch (error) {
      console.error('Error fetching share data:', error);
      setError('Failed to load shared project');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shareData || !enteredPassword.trim()) {
      setPasswordError('Please enter a password');
      return;
    }

    if (enteredPassword !== shareData.password) {
      setPasswordError('Incorrect password');
      return;
    }

    setPasswordError('');
    setAuthenticated(true);
    setPasswordRequired(false);
    await fetchProjectData(shareData);
  };

  const fetchProjectData = async (shareInfo: ShareData) => {
    try {
      setLoading(true);

      // Fetch project basic info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, status, location, start_date, end_date, created_at')
        .eq('id', shareInfo.project_id)
        .single();

      if (projectError || !project) {
        console.error('Project fetch error:', projectError);
        setError('Project not found');
        setLoading(false);
        return;
      }

      setProjectData(project);

      // Fetch data based on share options
      const options = shareInfo.share_options;

      // Fetch phases if selected
      if (options.phaseDetails) {
        const { data: phaseData, error: phaseError } = await supabase
          .from('phases')
          .select('id, name, start_date, end_date, status, estimated_cost, contractor_name')
          .eq('project_id', shareInfo.project_id)
          .order('start_date');
        if (phaseError) {
          console.error('Error fetching phases:', phaseError);
        }
        setPhases(phaseData || []);
      }

      // Fetch expenses if selected
      if (options.expenseDetails) {
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select(`
            id, amount, gst_amount, category, date,
            phases!inner(id, name)
          `)
          .eq('project_id', shareInfo.project_id)
          .eq('type', 'expense');
        if (expenseError) {
          console.error('Error fetching expenses:', expenseError);
        }
        setExpenses(expenseData || []);
      }

      // Fetch income if selected
      if (options.incomeDetails) {
        const { data: incomeData, error: incomeError } = await supabase
          .from('expenses')
          .select(`
            id, amount, gst_amount, category, date,
            phases!inner(id, name)
          `)
          .eq('project_id', shareInfo.project_id)
          .eq('type', 'income');
        if (incomeError) {
          console.error('Error fetching income:', incomeError);
        }
        setIncome(incomeData || []);
      }

      // Fetch materials if selected
      if (options.materialsDetails) {
        const { data: materialData, error: materialError } = await supabase
          .from('materials')
          .select('id, name, unit_cost, qty_required, status')
          .eq('project_id', shareInfo.project_id);
        if (materialError) {
          console.error('Error fetching materials:', materialError);
        }
        setMaterials(materialData || []);
      }

      // Fetch team members if selected
      if (options.teamMembers) {
        const { data: teamData, error: teamError } = await supabase
          .from('users')
          .select('id, name, email, role_id, status, active')
          .eq('project_id', shareInfo.project_id);
        if (teamError) {
          console.error('Error fetching team members:', teamError);
        }
        setTeamMembers(teamData || []);
      }

      // Fetch phase photos if selected
      if (options.phasePhotos) {
        const { data: photoData, error: photoError } = await supabase
          .from('phase_photos')
          .select(`
            id, photo_url, created_at,
            phases!inner(id, name)
          `)
          .eq('project_id', shareInfo.project_id);
        if (photoError) {
          console.error('Error fetching phase photos:', photoError);
        }
        setPhasePhotos(photoData || []);
      }

      // Fetch comments for this share
      await fetchComments(shareInfo.id);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setError('Failed to load project data');
      setLoading(false);
    }
  };

  // Fetch comments for this share
  const fetchComments = async (shareId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_shares')
        .select('comments')
        .eq('id', shareId)
        .single();

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      // Parse the JSONB comments array
      const commentsArray = data?.comments || [];
      setComments(commentsArray);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Submit a new comment
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shareData || !newComment.trim() || !commentAuthorName.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setSubmittingComment(true);
    
    try {
      // Create new comment object
      const newCommentObj = {
        id: crypto.randomUUID(),
        comment: newComment.trim(),
        author_name: commentAuthorName.trim(),
        created_at: new Date().toISOString()
      };

      // Get current comments and append new one
      const { data: currentData, error: fetchError } = await supabase
        .from('project_shares')
        .select('comments')
        .eq('id', shareData.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current comments:', fetchError);
        alert('Failed to submit comment. Please try again.');
        return;
      }

      const currentComments = currentData?.comments || [];
      const updatedComments = [...currentComments, newCommentObj];

      console.log('Updating comments for share:', shareData.id);
      console.log('Updated comments array:', updatedComments);

      // Update the comments array in the database
      const { error } = await supabase
        .from('project_shares')
        .update({ comments: updatedComments })
        .eq('id', shareData.id);

      if (error) {
        console.error('Error submitting comment:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        alert(`Failed to submit comment: ${error.message}`);
        return;
      }

      // Clear form and refresh comments
      setNewComment('');
      setCommentAuthorName('');
      await fetchComments(shareData.id);
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!shareId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Protected Project</h1>
            <p className="text-gray-600">This project is password protected. Please enter the password to continue.</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-600 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Access Project
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!projectData || !shareData) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{projectData.name}</h1>
              <p className="text-gray-600 mt-1">Shared Project View</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(projectData.status)}`}>
                {projectData.status}
              </span>
              {shareData.share_type === 'private' && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  <Lock className="h-4 w-4 inline mr-1" />
                  Private
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Project Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{projectData.location || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">
                    {projectData.start_date ? new Date(projectData.start_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium">
                    {projectData.end_date ? new Date(projectData.end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <File className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {new Date(projectData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            {projectData.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Description</p>
                <p className="text-gray-700">{projectData.description}</p>
              </div>
            )}
          </div>

          {/* Phases Section */}
          {shareData.share_options.phaseDetails && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Phases</h2>
              {phases.length > 0 ? (
                <div className="space-y-4">
                  {phases.map((phase) => (
                    <div key={phase.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{phase.name}</h3>
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(phase.status)}`}>
                          {phase.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Start:</span> {phase.start_date ? new Date(phase.start_date).toLocaleDateString() : 'Not set'}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {phase.end_date ? new Date(phase.end_date).toLocaleDateString() : 'Not set'}
                        </div>
                        <div>
                          <span className="font-medium">Estimated Cost:</span> {phase.estimated_cost ? `₹${Number(phase.estimated_cost).toLocaleString()}` : 'Not set'}
                        </div>
                      </div>
                      {phase.contractor_name && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Contractor:</span> {phase.contractor_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No phases available</p>
              )}
            </div>
          )}

          {/* Expenses Section */}
          {shareData.share_options.expenseDetails && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-red-600 mb-4">Expenses</h2>
              {expenses.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-red-50">
                          <th className="border p-3 text-left">Phase</th>
                          <th className="border p-3 text-left">Category</th>
                          <th className="border p-3 text-left">Amount</th>
                          <th className="border p-3 text-left">GST</th>
                          <th className="border p-3 text-left">Total</th>
                          <th className="border p-3 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((expense) => {
                          const amount = Number(expense.amount || 0);
                          const gstAmount = Number(expense.gst_amount || 0);
                          const total = amount + gstAmount;
                          return (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="border p-3">{expense.phases?.name || '-'}</td>
                              <td className="border p-3">{expense.category}</td>
                              <td className="border p-3 text-red-600">₹{amount.toLocaleString()}</td>
                              <td className="border p-3 text-red-600">
                                {gstAmount > 0 ? `₹${gstAmount.toLocaleString()}` : 'No GST'}
                              </td>
                              <td className="border p-3 text-red-600 font-semibold">₹{total.toLocaleString()}</td>
                              <td className="border p-3">{expense.date ? new Date(expense.date).toLocaleDateString() : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-lg font-semibold text-red-600">
                      Total Expenses: ₹{expenses.reduce((sum, e) => {
                        const amount = Number(e.amount || 0);
                        const gstAmount = Number(e.gst_amount || 0);
                        return sum + amount + gstAmount;
                      }, 0).toLocaleString()}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No expenses recorded</p>
              )}
            </div>
          )}

          {/* Income Section */}
          {shareData.share_options.incomeDetails && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-green-600 mb-4">Income</h2>
              {income.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-green-50">
                          <th className="border p-3 text-left">Phase</th>
                          <th className="border p-3 text-left">Category</th>
                          <th className="border p-3 text-left">Amount</th>
                          <th className="border p-3 text-left">GST</th>
                          <th className="border p-3 text-left">Total</th>
                          <th className="border p-3 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {income.map((incomeItem) => {
                          const amount = Number(incomeItem.amount || 0);
                          const gstAmount = Number(incomeItem.gst_amount || 0);
                          const total = amount + gstAmount;
                          return (
                            <tr key={incomeItem.id} className="hover:bg-gray-50">
                              <td className="border p-3">{incomeItem.phases?.name || '-'}</td>
                              <td className="border p-3">{incomeItem.category}</td>
                              <td className="border p-3 text-green-600">₹{amount.toLocaleString()}</td>
                              <td className="border p-3 text-green-600">
                                {gstAmount > 0 ? `₹${gstAmount.toLocaleString()}` : 'No GST'}
                              </td>
                              <td className="border p-3 text-green-600 font-semibold">₹{total.toLocaleString()}</td>
                              <td className="border p-3">{incomeItem.date ? new Date(incomeItem.date).toLocaleDateString() : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-lg font-semibold text-green-600">
                      Total Income: ₹{income.reduce((sum, i) => {
                        const amount = Number(i.amount || 0);
                        const gstAmount = Number(i.gst_amount || 0);
                        return sum + amount + gstAmount;
                      }, 0).toLocaleString()}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No income recorded</p>
              )}
            </div>
          )}

          {/* Materials Section */}
          {shareData.share_options.materialsDetails && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Materials</h2>
              {materials.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-3 text-left">Material Name</th>
                        <th className="border p-3 text-left">Unit Cost</th>
                        <th className="border p-3 text-left">Quantity Required</th>
                        <th className="border p-3 text-left">Status</th>
                        <th className="border p-3 text-left">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((material) => {
                        const unitCost = Number(material.unit_cost || 0);
                        const quantity = Number(material.qty_required || 0);
                        const totalValue = unitCost * quantity;
                        return (
                          <tr key={material.id} className="hover:bg-gray-50">
                            <td className="border p-3">{material.name}</td>
                            <td className="border p-3">₹{unitCost.toLocaleString()}</td>
                            <td className="border p-3">{quantity}</td>
                            <td className="border p-3">
                              <span className={`px-2 py-1 rounded text-sm ${getStatusColor(material.status)}`}>
                                {material.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="border p-3 font-semibold">₹{totalValue.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No materials recorded</p>
              )}
            </div>
          )}

          {/* Phase Photos Section */}
          {shareData.share_options.phasePhotos && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Phase Photos</h2>
              {phasePhotos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {phasePhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="relative">
                        <img
                          src={photo.photo_url}
                          alt="Phase photo"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute top-2 left-2">
                          <Camera className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{photo.phases?.name || 'Unknown Phase'}</p>
                        <p className="text-sm text-gray-500">
                          {photo.created_at ? new Date(photo.created_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No phase photos available</p>
              )}
            </div>
          )}

          {/* Team Members Section */}
          {shareData.share_options.teamMembers && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Members</h2>
              {teamMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 rounded-full p-2">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{member.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{member.email || 'No email'}</p>
                          <p className="text-xs text-gray-400">
                            {member.active ? 'Active' : 'Inactive'} • {member.status || 'pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No team members assigned</p>
              )}
            </div>
          )}

          {/* Comments Section */}
          {shareData.share_options.allowComments && (
            <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
              Comments
            </h2>
            
            {/* Existing Comments */}
            {comments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border-l-4 border-blue-200 pl-4 py-2 bg-gray-50 rounded-r-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{comment.author_name}</p>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-700">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment Form */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Add a Comment</h3>
              <form onSubmit={submitComment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={commentAuthorName}
                    onChange={(e) => setCommentAuthorName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment *
                  </label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Share your thoughts about this project..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim() || !commentAuthorName.trim()}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingComment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Comment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>This is a shared view of the project. Some information may be limited based on sharing permissions.</p>
          <p className="mt-1">
            Link expires: {new Date(shareData.expires_at).toLocaleDateString()} at {new Date(shareData.expires_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
