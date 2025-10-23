import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, User, Shield, Briefcase, Calculator, Wrench, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const ROLE_OPTIONS = [
  {
    value: 'Project Manager',
    label: 'Project Manager',
    icon: Briefcase,
    description: 'Manage projects, phases, and team coordination'
  },
  {
    value: 'Site Engineer',
    label: 'Site Engineer',
    icon: Wrench,
    description: 'Handle on-site operations and progress updates'
  },
  {
    value: 'Accounts',
    label: 'Accounts',
    icon: Calculator,
    description: 'Manage financial transactions and expenses'
  },
  {
    value: 'Client',
    label: 'Client',
    icon: User,
    description: 'View project progress and reports'
  }
];

export function UserFirstLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isValidUser, setIsValidUser] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [userData, setUserData] = useState<any>(null);
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
      // Note: This requires RLS policy to allow SELECT on users table
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailParam)
        .limit(1);

      console.log('Users query result:', { users, userError });
      console.log('Query details - Email:', emailParam, 'Found:', users?.length || 0);

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
      
      // Pre-select role if available
      if (user.role_id) {
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('role_name')
            .eq('id', user.role_id)
            .single();
          
          if (roleData?.role_name && !roleError) {
            setSelectedRole(roleData.role_name);
          }
        } catch (err) {
          console.log('Could not fetch role, user can select manually');
        }
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
    
    if (!selectedRole || !fullName.trim()) {
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
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            role: selectedRole,
          },
        },
      });

      if (signUpError) {
        throw new Error(`Account creation failed: ${signUpError.message}`);
      }

      if (!authData.user) {
        throw new Error('Account creation failed. Please try again.');
      }

      console.log('Auth user created:', authData.user.id);

      // 2. Create profile record
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          phone: phone || null,
          role: selectedRole,
          status: 'active',
          setup_completed: true,
          created_at: new Date().toISOString()
        });

      if (profileInsertError) {
        console.error('Profile insert error:', profileInsertError);
        throw new Error('Failed to complete profile setup. Please contact support.');
      }

      console.log('Profile created successfully');

      // 3. Update users table (optional - link auth user ID if column exists)
      const { error: updateUsersError } = await supabase
        .from('users')
        .update({
          name: fullName,
          phone: phone || null,
        })
        .eq('email', email);

      if (updateUsersError) {
        console.error('Users table update error:', updateUsersError);
        // Non-critical error, continue
      }

      // 4. Auto sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        showMessage('Account created! Please login manually with your credentials.', 'success');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

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
              Choose your role and complete your profile setup.
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
                  Select Your Role *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {ROLE_OPTIONS.map((role) => {
                    const Icon = role.icon;
                    return (
                      <motion.label
                        key={role.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedRole === role.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={selectedRole === role.value}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`p-2 rounded-lg mr-3 ${
                          selectedRole === role.value ? 'bg-blue-500' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            selectedRole === role.value ? 'text-white' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${
                            selectedRole === role.value ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {role.label}
                          </div>
                          <div className={`text-sm ${
                            selectedRole === role.value ? 'text-blue-700' : 'text-gray-500'
                          }`}>
                            {role.description}
                          </div>
                        </div>
                      </motion.label>
                    );
                  })}
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || !selectedRole || !fullName.trim() || password.length < 8}
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