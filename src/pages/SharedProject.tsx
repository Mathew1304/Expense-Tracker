import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Eye, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  Package, 
  Users, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SharedProject() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [phasePhotos, setPhasePhotos] = useState<any[]>([]);
  
  // Password verification for private links
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Add debug logging for route params
  useEffect(() => {
    console.log('🔍 SharedProject component mounted');
    console.log('🔍 shareId from params:', shareId);
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
  }, []);

  useEffect(() => {
    if (shareId) {
      console.log('🔍 Starting fetchShareData for shareId:', shareId);
      fetchShareData();
    } else {
      console.log('❌ No shareId found in URL params');
      setError('Invalid share link - no share ID found');
      setLoading(false);
    }
  }, [shareId]);

  const fetchShareData = async () => {
    try {
      console.log('🔍 fetchShareData called with shareId:', shareId);
      setLoading(true);
      
      // Fetch share data
      console.log('🔍 Fetching share data from project_shares table...');
      const { data: shareResult, error: shareError } = await supabase
        .from('project_shares')
        .select('*')
        .eq('id', shareId)
        .maybeSingle();

      if (shareError) {
        console.error('Share fetch error:', shareError);
        throw new Error('Share link not found');
      }
      
      if (!shareResult) {
        console.log('❌ No share data found for shareId:', shareId);
        throw new Error('Share link not found');
      }
      
      console.log('✅ Share data found:', shareResult);
      
      // Check if link has expired
      const now = new Date();
      const expiresAt = new Date(shareResult.expires_at);
      console.log('🔍 Checking expiry - Now:', now, 'Expires:', expiresAt);
      
      if (now > expiresAt) {
        console.log('❌ Share link has expired');
        throw new Error('This share link has expired');
      }

      setShareData(shareResult);
      console.log('✅ Share data set successfully');

      // If private link, show password form
      if (shareResult.share_type === 'private') {
        console.log('🔒 Private link detected, showing password form');
        setShowPasswordForm(true);
        setLoading(false);
        return;
      }

      // If public link, fetch project data directly
      console.log('🌐 Public link detected, fetching project data');
      await fetchProjectData(shareResult.project_id);
      
    } catch (error: any) {
      console.error('Fetch share data error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const verifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Please enter the password');
      return;
    }

    if (password !== shareData.password) {
      setPasswordError('Incorrect password');
      return;
    }

    setPasswordError('');
    setShowPasswordForm(false);
    await fetchProjectData(shareData.project_id);
  };

  const fetchProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching project data for ID:', projectId);
      console.log('=== STARTING DATA FETCH ===');
      
      // Test if we can access the project_shares table
      console.log('🧪 Testing project_shares access...');
      const { data: shareTest, error: shareTestError } = await supabase
        .from('project_shares')
        .select('*')
        .eq('project_id', projectId);
      
      if (shareTestError) {
        console.error('❌ Cannot access project_shares:', shareTestError);
      } else {
        console.log('✅ project_shares accessible:', shareTest);
      }

      // Fetch project details
      console.log('🔍 Fetching project details...');
      const { data: projectResult, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('❌ Project fetch error:', projectError);
        console.error('❌ Project error details:', JSON.stringify(projectError, null, 2));
        throw new Error(`Project fetch error: ${projectError.message}`);
      }
      
      if (!projectResult) {
        throw new Error('Project not found');
      }
      
      setProject(projectResult);
      console.log('✅ Project fetched successfully:', projectResult.name);

      // Fetch phases
      console.log('🔍 Fetching phases for project:', projectId);
      const { data: phasesData, error: phasesError } = await supabase
        .from('phases')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (phasesError) {
        console.error('❌ Phases fetch error:', phasesError);
        console.error('❌ Phases error details:', JSON.stringify(phasesError, null, 2));
        console.error('❌ Phases error code:', phasesError.code);
        console.error('❌ Phases error hint:', phasesError.hint);
      } else {
        console.log('✅ Phases fetched:', phasesData?.length || 0);
        if (phasesData && phasesData.length > 0) {
          console.log('✅ First phase sample:', phasesData[0]);
        }
      }
      setPhases(phasesData || []);

      // Fetch expenses
      console.log('🔍 Fetching expenses for project:', projectId);
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (expensesError) {
        console.error('❌ Expenses fetch error:', expensesError);
        console.error('❌ Expenses error details:', JSON.stringify(expensesError, null, 2));
      } else {
        console.log('✅ Expenses fetched:', expensesData?.length || 0);
      }
      setExpenses(expensesData || []);

      // Fetch materials
      console.log('🔍 Fetching materials for project:', projectId);
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

      if (materialsError) {
        console.error('❌ Materials fetch error:', materialsError);
        console.error('❌ Materials error details:', JSON.stringify(materialsError, null, 2));
        console.error('❌ Materials error code:', materialsError.code);
        console.error('❌ Materials error hint:', materialsError.hint);
      } else {
        console.log('✅ Materials fetched:', materialsData?.length || 0);
        if (materialsData && materialsData.length > 0) {
          console.log('✅ First material sample:', materialsData[0]);
        }
      }
      setMaterials(materialsData || []);

      // Fetch phase photos 
      console.log('🔍 Fetching phase photos for project:', projectId);
      const { data: photosData, error: photosError } = await supabase
        .from('phase_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (photosError) {
        console.error('❌ Phase photos fetch error:', photosError);
        console.error('❌ Phase photos error details:', JSON.stringify(photosError, null, 2));
      } else {
        console.log('✅ Phase photos fetched:', photosData?.length || 0);
      }
      setPhasePhotos(photosData || []);

      // After fetching all data, get phase names for expenses and photos
      if (phasesData && phasesData.length > 0) {
        console.log('✅ Mapping phase names...');
        // Map phase names to expenses
        const expensesWithPhases = (expensesData || []).map(expense => {
          const phase = phasesData.find(p => p.id === expense.phase_id);
          return {
            ...expense,
            phase_name: phase?.name || 'No Phase'
          };
        });
        setExpenses(expensesWithPhases);

        // Map phase names to photos
        const photosWithPhases = (photosData || []).map(photo => {
          const phase = phasesData.find(p => p.id === photo.phase_id);
          return {
            ...photo,
            phase_name: phase?.name || 'Unknown Phase'
          };
        });
        setPhasePhotos(photosWithPhases);
        console.log('✅ Phase names mapped successfully');
      }

      setLoading(false);
      console.log('✅ All data fetched successfully');
      
      // Final summary log
      console.log('=== FINAL DATA SUMMARY ===');
      console.log('✅ Project:', projectResult?.name);
      console.log('✅ Phases count:', phasesData?.length || 0);
      console.log('✅ Expenses count:', expensesData?.length || 0);
      console.log('✅ Materials count:', materialsData?.length || 0);
      console.log('✅ Photos count:', photosData?.length || 0);
      console.log('=== END DATA SUMMARY ===');
    } catch (error: any) {
      console.error('❌ Fetch project data error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (showPasswordForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Protected Project</h1>
            <p className="text-gray-600">This project is password protected. Please enter the password to continue.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>
            
            <button
              onClick={verifyPassword}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Access Project
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have the password? Contact the project admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                {project.location && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {project.location}
                  </span>
                )}
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {project.start_date ? formatDate(project.start_date) : 'No start date'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                Shared {shareData?.share_type === 'private' ? 'privately' : 'publicly'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Expires: {formatDate(shareData?.expires_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Description */}
        {project.description && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Project Description</h2>
            <p className="text-gray-700">{project.description}</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Phases</p>
                <p className="text-2xl font-bold text-gray-900">{phases.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Materials</p>
                <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phases */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Project Phases</h2>
          </div>
          <div className="p-6">
            {phases.length > 0 ? (
              <div className="space-y-4">
                {phases.map((phase) => (
                  <div key={phase.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{phase.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(phase.status)}`}>
                        {phase.status || 'Not Set'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Start Date:</span> {phase.start_date ? formatDate(phase.start_date) : 'Not set'}
                      </div>
                      <div>
                        <span className="font-medium">End Date:</span> {phase.end_date ? formatDate(phase.end_date) : 'Not set'}
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
              <p className="text-gray-500 text-center py-8">No phases found for this project.</p>
            )}
          </div>
        </div>

        {/* Phase Photos */}
        {phasePhotos.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Phase Photos</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {phasePhotos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <img
                      src={photo.photo_url}
                      alt="Phase photo"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Phase: {photo.phase_name || 'Unknown'}</p>
                      <p className="text-gray-600">{photo.created_at ? formatDate(photo.created_at) : 'Unknown date'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expenses */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Project Expenses</h2>
          </div>
          <div className="p-6">
            {expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.phase_name || 'No Phase'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.category || 'Uncategorized'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₹{Number(expense.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.date ? formatDate(expense.date) : 'No Date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.payment_method || 'Not Specified'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    Total: ₹{expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No expenses recorded for this project.</p>
            )}
          </div>
        </div>

        {/* Materials */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Materials Inventory</h2>
          </div>
          <div className="p-6">
            {materials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {materials.map((material) => (
                      <tr key={material.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {material.name || 'Unnamed Material'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{Number(material.unit_cost || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.qty_required || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(material.status)}`}>
                            {material.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {material.updated_at ? formatDate(material.updated_at) : 'No Date'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No materials recorded for this project.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}