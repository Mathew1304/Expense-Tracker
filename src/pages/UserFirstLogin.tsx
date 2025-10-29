import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createUserWithoutEmailConfirmation } from '../lib/emailService';
import { Building2, User, Shield, Briefcase, Calculator, Wrench, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

export function UserFirstLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isValidUser, setIsValidUser] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [assignedRole, setAssignedRole] = useState<string>('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkUserEligibility();
  }, []);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  const checkUserEligibility = async () => {
    setCheckingUser(true);
    
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    console.log('Email from URL:', emailParam);
    
    if (!emailParam) {
      showMessage('Access denied. This page is only for users created by administrators.', 'error');
      setCheckingUser(false);
      return;
    }

    setEmail(emailParam);
    
    try {
      // Check if user exists in users table
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailParam)
        .limit(1);

      console.log('Users query result:', { users, userError });

      if (userError) {
        console.error('User query error:', userError);
        showMessage('Database error. Please contact your administrator.', 'error');
        setCheckingUser(false);
        return;
      }

      if (!users || users.length === 0) {
        showMessage('Invalid access. This email was not found in our system. Please contact your administrator.', 'error');
        setCheckingUser(false);
        return;
      }

      const user = users[0];
      console.log('Found user:', user);

      // Check if auth user already exists by checking profiles table
      const { data: existingProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, setup_completed')
        .eq('email', emailParam);

      console.log('Profile check result:', { existingProfiles, profileError });

      if (existingProfiles && existingProfiles.length > 0) {
        const profile = existingProfiles[0];
        if (profile.setup_completed) {
          showMessage('Setup already completed. Redirecting to login...', 'info');
          setTimeout(() => navigate('/login'), 2000);
          setCheckingUser(false);
          return;
        }
      }

      // Valid user who hasn't completed setup
      setIsValidUser(true);
      setUserData(user);
      setFullName(user.name || '');
      setPhone(user.phone || '');
      
      // Fetch assigned role name and permissions if available
      if (user.role_id) {
        console.log('Fetching role for role_id:', user.role_id);
        
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('role_name, permissions')
          .eq('id', user.role_id)
          .single();
        
        console.log('Role fetch result:', { roleData, roleError });
        
        if (roleData && !roleError) {
          setAssignedRole(roleData.role_name);
          setRolePermissions(roleData.permissions || []);
          console.log('Role assigned:', roleData.role_name);
        } else {
          console.error('Failed to fetch role:', roleError);
          setAssignedRole('Role not found');
        }
      } else {
        console.log('No role_id found for user');
        setAssignedRole('No role assigned');
      }

      showMessage('Welcome! Please complete your account setup below.', 'info');

    } catch (error) {
      console.error('Eligibility check error:', error);
      showMessage('An error occurred while verifying your access. Please try again.', 'error');
    }
    
    setCheckingUser(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      showMessage('Please fill in all required fields.', 'error');
      return;
    }

    if (password.length < 8) {
      showMessage('Password must be at least 8 characters long.', 'error');
      return;
    }

    setLoading(true);
    showMessage('Creating your account...', 'info');

    try {
      // 1. Create auth user without email confirmation using server function
      const authResult = await createUserWithoutEmailConfirmation(
        email,
        password,
        fullName,
        assignedRole,
        rolePermissions
      );

      if (!authResult.success) {
        // Provide more specific error messages for common issues
        if (authResult.error?.includes('already has a completed profile')) {
          throw new Error('This email is already registered and setup is complete. Please sign in instead.');
        } else if (authResult.error?.includes('already been registered')) {
          throw new Error('This email is already registered. If you haven\'t completed setup, please try again or contact support.');
        } else {
          throw new Error(`Account creation failed: ${authResult.error}`);
        }
      }

      if (!authResult.user) {
        throw new Error('Account creation failed. Please try again.');
      }

      console.log('Auth user created:', authResult.user.id);

      // 2. Sign in the user so auth.uid() works for RLS policies
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

       if (signInError) {
         console.error('Sign in error:', signInError);
         // Continue without showing error to user
         console.log('Sign in failed, but continuing with profile creation');
       }

      console.log('User signed in successfully');

      // 3. Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, setup_completed')
        .eq('id', authResult.user.id)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('Profile check error:', profileCheckError);
        throw new Error('Failed to check existing profile. Please contact support.');
      }

      // If profile exists and setup is already completed, redirect to dashboard
      if (existingProfile && existingProfile.setup_completed) {
        console.log('Profile already exists and setup completed, redirecting to dashboard');
        showMessage('Account already set up! Redirecting to dashboard...', 'success');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }

      // 4. Create or update profile record with role and permissions
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .upsert({
          id: authResult.user.id,
          email: email,
          full_name: fullName,
          phone: phone || null,
          role: assignedRole,
          permissions: rolePermissions, // Store role permissions if your profiles table has this column
          status: 'active',
          setup_completed: true,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileInsertError) {
        console.error('Profile insert error:', profileInsertError);
        
        // Check if it's an RLS policy violation
        if (profileInsertError.code === '42501') {
          console.log('RLS policy violation detected. This usually means the profiles table RLS policies need to be updated.');
          console.log('Please run the fix_profiles_rls_policies.sql script in your Supabase SQL Editor.');
          throw new Error('Profile creation blocked by security policies. Please contact your administrator to update the database policies.');
        }
        
        throw new Error('Failed to complete profile setup. Please contact support.');
      }

      console.log('Profile created successfully');

      // 5. Update users table
      const { error: updateUsersError } = await supabase
        .from('users')
        .update({
          name: fullName,
          phone: phone || null,
          auth_user_id: authResult.user.id, // Link to auth user if column exists
        })
        .eq('email', email);

      if (updateUsersError) {
        console.error('Users table update error:', updateUsersError);
        // Non-critical error, continue
      }

      // 6. Redirect to dashboard (user is already signed in)
      showMessage('Account created successfully! Redirecting to dashboard...', 'success');
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch (error: any) {
      console.error('Setup error:', error);
      showMessage(error.message || 'Failed to complete setup. Please try again or contact support.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isValidUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex"
      >
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-12 relative overflow-hidden">
          <div className="absolute top-8 left-8">
            <div className="flex items-center text-white/80">
              <Building2 className="w-6 h-6 mr-2" />
              <span className="text-sm font-medium">BUILD MY HOMES</span>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-12 right-12 w-16 h-16 bg-white/10 rounded-full"></div>
          <div className="absolute top-32 right-32 w-8 h-8 bg-white/20 rounded-full"></div>
          <div className="absolute bottom-32 left-12 w-12 h-12 bg-white/15 rounded-full"></div>
          
          <div className="flex flex-col justify-center text-white relative z-10">
            <p className="text-lg mb-4 opacity-90">Complete Your Setup</p>
            <h1 className="text-5xl font-bold mb-8 leading-tight">
              WELCOME TO THE TEAM
            </h1>
            <p className="text-white/80 leading-relaxed max-w-sm">
              You're just one step away from accessing your personalized dashboard. 
              Your role has been assigned and you can complete your profile setup below.
            </p>
          </div>
        </div>

        {/* Right Panel - Setup Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            <div className="lg:hidden flex justify-center mb-6">
              <Building2 className="h-12 w-12 text-blue-600" />
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Profile</h2>
            <p className="text-gray-500 mb-8">
              Set up your account to access the dashboard
            </p>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 text-sm p-4 rounded-lg border flex items-start gap-3 ${
                  messageType === 'success' 
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : messageType === 'error'
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-blue-700 bg-blue-50 border-blue-200'
                }`}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{message}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Create Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a strong password (min 8 characters)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use the password sent to your email or create a new one
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your Assigned Role
                </label>
                <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-blue-900">
                        {assignedRole || 'Loading role...'}
                      </div>
                      <div className="text-sm text-blue-700">
                        {assignedRole && assignedRole !== 'Loading role...' && assignedRole !== 'No role assigned' && assignedRole !== 'Role not found'
                          ? 'This role has been assigned to you by your administrator'
                          : 'Please contact your administrator if role is missing'}
                      </div>
                      {rolePermissions.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          {rolePermissions.length} permissions assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || !fullName.trim() || password.length < 8}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full bg-blue-500 text-white font-bold py-4 rounded-full hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors text-lg tracking-wide"
              >
                {loading ? 'CREATING ACCOUNT...' : 'COMPLETE SETUP'}
              </motion.button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  Already completed setup? Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}