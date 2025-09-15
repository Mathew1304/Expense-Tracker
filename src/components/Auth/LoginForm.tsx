import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false); // true when user clicks reset link
  const navigate = useNavigate();

  // Check session on load and detect password reset link
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    // Detect password reset link query params
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const accessToken = params.get('access_token');

    if (type === 'recovery' && accessToken) {
      supabase.auth.setSession({ access_token: accessToken });
      setResetMode(true);
      setShowForgotPassword(true);
    }

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Sign-up / Login
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/login',
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMessage(
          'Sign-up successful! Please check your email to confirm your account before logging in.'
        );
        setEmail('');
        setPassword('');
        setFullName('');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (!data.user?.confirmed_at) {
          setMessage('Please verify your email first. A confirmation link has been sent.');
          return;
        }

        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setMessage(err?.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage('Logout failed. Please try again.');
    } else {
      navigate('/login', { replace: true });
    }
  };

  // Send password reset email
  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      setMessage('Password reset email sent. Please check your inbox.');
      setEmail('');
      setShowForgotPassword(false);
    } catch (err: any) {
      setMessage(err?.message || 'Error sending reset email');
    } finally {
      setLoading(false);
    }
  };

  // Set new password after clicking reset link
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password updated successfully! You can now log in.');
      setPassword('');
      setShowForgotPassword(false);
      setResetMode(false);
    } catch (err: any) {
      setMessage(err?.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <div className="flex justify-center mb-6">
          <Building2 className="h-12 w-12 text-blue-600" />
        </div>

        <h2 className="text-center text-2xl font-bold text-gray-800 mb-6">
          {user
            ? `Welcome, ${user.user_metadata?.full_name || user.email}`
            : isSignUp
            ? 'Create Your Account'
            : 'Sign In to ConstructPro'}
        </h2>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mb-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {!user && !showForgotPassword ? (
          <motion.form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-800"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-800"
                placeholder="your@example.com"
              />
            </div>

            {!resetMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-800"
                  placeholder="••••••••"
                />
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading
                ? 'Processing...'
                : resetMode
                ? 'Set New Password'
                : isSignUp
                ? 'Sign Up'
                : 'Sign In'}
            </motion.button>

            {!resetMode && (
              <>
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign In'
                      : 'Need an account? Sign Up'}
                  </button>
                </div>
              </>
            )}
          </motion.form>
        ) : showForgotPassword ? (
          <motion.div className="space-y-5">
            {!resetMode ? (
              <form onSubmit={handleForgotPasswordEmail}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-800"
                    placeholder="your@example.com"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleNewPassword}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-800"
                    placeholder="Enter new password"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? 'Processing...' : 'Set New Password'}
                </motion.button>
              </form>
            )}
            {!resetMode && (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center space-y-4">
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default LoginForm;
