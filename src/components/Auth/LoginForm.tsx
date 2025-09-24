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
  const [forgotEmail, setForgotEmail] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const navigate = useNavigate();

  // Check session on load
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

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
            emailRedirectTo: `${window.location.origin}/login`,
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        if (data?.user?.id) {
          setMessage('Sign-up successful. Please check your email to confirm your account.');
          navigate('/login', { replace: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setMessage(err?.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
      setMessage('Logout failed. Please try again.');
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setMessage('Password reset email sent. Please check your inbox.');
      setForgotEmail('');
      setShowForgotPassword(false);
    } catch (err: any) {
      setMessage(err?.message || 'Error sending reset email');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
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
            Welcome, {user.user_metadata?.full_name || user.email}
          </h2>
          <div className="text-center space-y-4">
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex"
      >
        {/* Left Panel - Blue Gradient */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-12 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-8 left-8">
            <div className="flex items-center text-white/80">
              <Building2 className="w-6 h-6 mr-2" />
              <span className="text-sm font-medium">BUILD MY HOMES</span>
            </div>
          </div>
          
          {/* Decorative Circles */}
          <div className="absolute top-12 right-12 w-16 h-16 bg-white/10 rounded-full"></div>
          <div className="absolute top-32 right-32 w-8 h-8 bg-white/20 rounded-full"></div>
          <div className="absolute bottom-32 left-12 w-12 h-12 bg-white/15 rounded-full"></div>
          <div className="absolute bottom-12 right-20 w-6 h-6 bg-white/25 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/20 rounded-full"></div>
          
          {/* Content */}
          <div className="flex flex-col justify-center text-white relative z-10">
            <p className="text-lg mb-4 opacity-90">Nice to see you again</p>
            <h1 className="text-5xl font-bold mb-8 leading-tight">
              WELCOME BACK
            </h1>
            <p className="text-white/80 leading-relaxed max-w-sm">
            Track every brick, every rupee  manage your construction expenses with ease.

Stay on budget, stay on schedule  your project’s financial control starts here.

One platform to monitor costs, materials, and progress  all in real time.
            </p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            <div className="lg:hidden flex justify-center mb-6">
              <Building2 className="h-12 w-12 text-blue-600" />
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {showForgotPassword 
                ? 'Reset Password' 
                : isSignUp 
                ? 'Create Account' 
                : 'Login Account'}
            </h2>
            
            {!showForgotPassword && (
              <p className="text-gray-500 mb-8 leading-relaxed">
                {isSignUp 
                  ? 'Create your account to get started with our services'
                  : ''}
              </p>
            )}

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200"
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {!showForgotPassword ? (
              <motion.form onSubmit={handleAuth} className="space-y-6">
                {isSignUp && (
                  <div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-0 py-3 border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors bg-transparent text-gray-700 placeholder-gray-400"
                      placeholder="Full Name"
                    />
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-0 py-3 border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors bg-transparent text-gray-700 placeholder-gray-400"
                    placeholder="Email ID"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-0 py-3 border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors bg-transparent text-gray-700 placeholder-gray-400"
                    placeholder="Password"
                  />
                </div>

                {!isSignUp && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-600">Keep me signed in</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      Forgot Password
                    </button>
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-500 text-white font-bold py-4 rounded-full hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-lg tracking-wide"
                >
                  {loading ? 'PROCESSING...' : isSignUp ? 'SIGN UP' : 'LOGIN'}
                </motion.button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp((s) => !s)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full px-0 py-3 border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors bg-transparent text-gray-700 placeholder-gray-400"
                    placeholder="Email ID"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-500 text-white font-bold py-4 rounded-full hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-lg tracking-wide"
                >
                  {loading ? 'PROCESSING...' : 'SEND RESET EMAIL'}
                </motion.button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Back to Sign In
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginForm;