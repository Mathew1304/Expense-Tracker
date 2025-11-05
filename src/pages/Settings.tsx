import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Bell,
  Palette,
  Settings as SettingsIcon,
  CreditCard,
  Save,
  Eye,
  EyeOff,
  Camera,
  MapPin,
  Phone,
  Mail,
  Building,
  Globe,
  Instagram,
  Hash,
  Calendar,
  Crown,
  Coins,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Layout } from '../components/Layout/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { testSMSService } from '../lib/smsService';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  gst_number: string;
  website: string;
  instagram: string;
  role: string;
  status: string;
  subscription_type: string;
  plan_id: string;
  subscription_start: string;
  subscription_end: string;
  created_at: string;
  logo_url?: string;
  logo_name?: string;
  logo_uploaded_at?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
}

interface Subscription {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: string;
  plans: Plan;
}

interface UserTokens {
  tokens_balance: number;
}

export function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userTokens, setUserTokens] = useState<UserTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    projectUpdates: true,
    expenseAlerts: true,
    phaseCompletion: true,
    systemUpdates: false
  });
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    language: 'en',
    dateFormat: 'dd-MM-yyyy',
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  });
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestLoading, setSmsTestLoading] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSubscription();
      fetchUserTokens();
    }
  }, [user]);

  useEffect(() => {
    if (profile?.logo_url) {
      setLogoPreview(profile.logo_url);
    }
  }, [profile?.logo_url]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (
            id,
            name,
            price,
            description,
            features
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (!error && data) {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchUserTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('tokens_balance')
        .eq('id', user?.id)
        .single();

      if (!error && data) {
        setUserTokens(data);
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    }
  };

  const handleProfileUpdate = async (updatedData: Partial<Profile>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updatedData } : null);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSuccessMessage('Failed to update profile. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword.trim()) {
      setSuccessMessage('Please enter your current password.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    if (!passwordData.newPassword.trim()) {
      setSuccessMessage('Please enter a new password.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSuccessMessage('New passwords do not match.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setSuccessMessage('Password must be at least 6 characters long.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setSuccessMessage('New password must be different from current password.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setSaving(true);
    try {
      if (!user?.email) {
        throw new Error('User email not found');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setSuccessMessage('Password updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setSuccessMessage(error.message || 'Failed to update password. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) {
      setSuccessMessage('Please select a file.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSuccessMessage('Please upload an image file (PNG, JPG, etc.)');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSuccessMessage('File size must be less than 5MB');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setLogoUploading(true);
    try {
      // Debug: Log user info
      console.log('Current user ID:', user.id);
      console.log('Profile ID:', profile?.id);
      
      // Simple filename without nested folders
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExtension}`;
      console.log('Uploading to:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });
      
      console.log('Upload result:', { uploadData, uploadError });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const logoUrl = data.publicUrl;

      // Debug: Log update attempt
      console.log('Attempting to update profile with:', {
        logo_url: logoUrl,
        logo_name: file.name,
        user_id: user.id
      });

      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          logo_url: logoUrl,
          logo_name: file.name,
          logo_uploaded_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();
      
      // Debug: Log result
      console.log('Update result:', { updateData, updateError });

      if (updateError) throw updateError;

      setProfile(prev => prev ? {
        ...prev,
        logo_url: logoUrl,
        logo_name: file.name
      } : null);

      setLogoPreview(logoUrl);
      setSuccessMessage('Logo uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      setSuccessMessage(`Failed to upload logo: ${error.message}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user?.id || !profile?.logo_url) return;

    setLogoUploading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          logo_url: null,
          logo_name: null,
          logo_uploaded_at: null
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? {
        ...prev,
        logo_url: undefined,
        logo_name: undefined
      } : null);

      setLogoPreview(null);
      setSuccessMessage('Logo removed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error removing logo:', error);
      setSuccessMessage(`Failed to remove logo: ${error.message}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleTestSMS = async () => {
    if (!smsTestPhone.trim()) {
      setSmsTestResult({ success: false, message: 'Please enter a phone number' });
      return;
    }

    setSmsTestLoading(true);
    setSmsTestResult(null);

    try {
      const result = await testSMSService(smsTestPhone);
      setSmsTestResult({
        success: result.success,
        message: result.success
          ? 'Test SMS sent successfully! Check your phone.'
          : `Failed to send SMS: ${result.error}`
      });
    } catch (error: any) {
      setSmsTestResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setSmsTestLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'branding', label: 'Branding', icon: Building },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: SettingsIcon },
    { id: 'sms', label: 'SMS Testing', icon: Phone },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ];

  if (loading) {
    return (
      <Layout title="Settings">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      <div className="max-w-7xl mx-auto">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg shadow">
            {successMessage}
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-80 bg-white rounded-lg shadow-sm p-6">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-8">
            {activeTab === 'profile' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                  <button
                    onClick={() => handleProfileUpdate(profile || {})}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile?.full_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={profile?.email || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={profile?.phone || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile?.company || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, company: e.target.value } : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your company name"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile?.location || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your location"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Number
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile?.gst_number || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, gst_number: e.target.value } : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter GST number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        value={profile?.website || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, website: e.target.value } : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter website URL"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instagram
                    </label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile?.instagram || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, instagram: e.target.value } : null)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Instagram handle"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <p className="font-medium text-gray-900 capitalize">{profile?.role || 'User'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        profile?.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : profile?.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {profile?.status || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Member Since</p>
                      <p className="font-medium text-gray-900">
                        {profile?.created_at ? format(new Date(profile.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Branding</h2>

                <div className="space-y-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
                    <p className="text-sm text-gray-600 mb-6">Upload your company logo to be displayed on exported reports and documents.</p>

                    <div className="space-y-4">
                      {logoPreview ? (
                        <div className="relative">
                          <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <div className="text-center">
                              <img
                                src={logoPreview}
                                alt="Company Logo"
                                className="h-32 object-contain mx-auto mb-4"
                              />
                              <p className="text-sm text-gray-600 mb-2">Current Logo</p>
                              <p className="text-xs text-gray-500">{profile?.logo_name}</p>
                            </div>
                          </div>
                          <button
                            onClick={handleRemoveLogo}
                            disabled={logoUploading}
                            className="mt-3 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {logoUploading ? 'Removing...' : 'Remove Logo'}
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors">
                          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600 mb-2">No logo uploaded yet</p>
                          <p className="text-xs text-gray-500 mb-4">Supported formats: PNG, JPG, SVG (Max 5MB)</p>
                          <label className="inline-block">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              disabled={logoUploading}
                              className="hidden"
                            />
                            <span className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-block disabled:opacity-50 transition-colors">
                              {logoUploading ? 'Uploading...' : 'Choose Logo'}
                            </span>
                          </label>
                        </div>
                      )}

                      {logoPreview && (
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={logoUploading}
                            className="hidden"
                          />
                          <span className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 transition-colors">
                            {logoUploading ? 'Uploading...' : 'Change Logo'}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Building className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-blue-900">Logo Usage</h3>
                        <ul className="text-sm text-blue-800 mt-2 space-y-1">
                          <li>• Logo appears on the first page of exported expense reports</li>
                          <li>• Logo is centered and scaled automatically</li>
                          <li>• Recommended size: 300x300px or higher</li>
                          <li>• Best results with PNG format and transparent background</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>

                <div className="space-y-6">
                  <div className="p-6 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-blue-900">Account Security</h3>
                        <p className="text-sm text-blue-800 mt-1">Keep your account secure by regularly updating your password and managing access permissions.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                    <p className="text-sm text-gray-600 mb-4">Update your password regularly to keep your account secure.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder="Enter your current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter a new password (min 6 characters)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirm your new password"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handlePasswordChange}
                          disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {saving ? 'Updating Password...' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Tips</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Use a strong password with uppercase, lowercase, numbers, and symbols</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Change your password every 3-6 months</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Never share your password with anyone</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">Log out from other sessions if you suspect unauthorized access</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {key === 'emailNotifications' && 'Receive notifications via email'}
                          {key === 'pushNotifications' && 'Receive push notifications in browser'}
                          {key === 'projectUpdates' && 'Get notified about project status changes'}
                          {key === 'expenseAlerts' && 'Receive alerts for expense approvals'}
                          {key === 'phaseCompletion' && 'Get notified when phases are completed'}
                          {key === 'systemUpdates' && 'Receive system maintenance notifications'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Appearance Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {['light', 'dark', 'system'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setAppearanceSettings(prev => ({ ...prev, theme }))}
                          className={`p-4 border-2 rounded-lg text-center capitalize transition-colors ${
                            appearanceSettings.theme === theme
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={appearanceSettings.language}
                        onChange={(e) => setAppearanceSettings(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="ta">Tamil</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        value={appearanceSettings.dateFormat}
                        onChange={(e) => setAppearanceSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="dd-MM-yyyy">DD-MM-YYYY</option>
                        <option value="MM-dd-yyyy">MM-DD-YYYY</option>
                        <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={appearanceSettings.currency}
                        onChange={(e) => setAppearanceSettings(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={appearanceSettings.timezone}
                        onChange={(e) => setAppearanceSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="Asia/Mumbai">Asia/Mumbai</option>
                        <option value="Asia/Delhi">Asia/Delhi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">System Information</h2>
                
                <div className="space-y-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">User ID</p>
                        <p className="font-mono text-sm text-gray-900">{user?.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Account Created</p>
                        <p className="text-sm text-gray-900">
                          {profile?.created_at ? format(new Date(profile.created_at), 'PPP') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {userTokens && (
                    <div className="p-6 border border-gray-200 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-600" />
                        Token Balance
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-yellow-600">
                          {userTokens.tokens_balance}
                        </div>
                        <div className="text-sm text-gray-600">
                          Available tokens for bidding and premium features
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Export Account Data
                      </button>
                      <button className="w-full text-left p-3 border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>
                
                <div className="space-y-6">
                  {subscription ? (
                    <div className="p-6 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Crown className="w-5 h-5 text-yellow-600" />
                          Current Plan: {subscription.plans.name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          subscription.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subscription.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">Monthly Price</p>
                          <p className="text-2xl font-bold text-gray-900">₹{subscription.plans.price}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Next Billing Date</p>
                          <p className="font-medium text-gray-900">
                            {subscription.end_date ? format(new Date(subscription.end_date), 'PPP') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">Plan Features</h4>
                        <ul className="space-y-1">
                          {subscription.plans.features.map((feature, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-3">
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                          Upgrade Plan
                        </button>
                        <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors">
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border border-gray-200 rounded-lg text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                      <p className="text-gray-600 mb-4">Subscribe to a plan to access premium features</p>
                      <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        View Plans
                      </button>
                    </div>
                  )}

                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
                    <p className="text-gray-600">No billing history available</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sms' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">SMS Testing</h2>
                
                <div className="space-y-6">
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-blue-600" />
                      Test SMS Notifications
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          placeholder="+1234567890"
                          value={smsTestPhone}
                          onChange={(e) => setSmsTestPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Include country code (e.g., +1 for US, +91 for India)
                        </p>
                      </div>
                      
                      <button
                        onClick={handleTestSMS}
                        disabled={smsTestLoading || !smsTestPhone.trim()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {smsTestLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4" />
                            Send Test SMS
                          </>
                        )}
                      </button>
                      
                      {smsTestResult && (
                        <div className={`p-4 rounded-lg ${
                          smsTestResult.success 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            {smsTestResult.success ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <AlertCircle className="w-5 h-5" />
                            )}
                            <span className="font-medium">
                              {smsTestResult.success ? 'Success!' : 'Error'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{smsTestResult.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Configuration</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Server-side SMS Service</span>
                        <span className="text-xs text-green-600">Active</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Edge Function</span>
                        <span className="text-xs text-green-600">Deployed</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Twilio Integration</span>
                        <span className="text-xs text-green-600">Server-side</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      SMS notifications are handled server-side via Supabase Edge Functions for security and reliability.
                    </p>
                  </div>
                  
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-sm text-gray-600">Material Added</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-sm text-gray-600">Material Updated</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-sm text-gray-600">Material Deleted</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Admins will receive SMS notifications when users perform these actions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}