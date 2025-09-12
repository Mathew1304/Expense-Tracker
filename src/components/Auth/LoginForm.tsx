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
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        if (data?.user?.id) {
          navigate('/', { replace: true });
        } else {
          setMessage(
            'Sign-up successful. Please check your email to confirm your account.'
          );
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
      {/* Animated gradient wave background */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-sky-blue/20 via-coral/20 to-purple-200/20 animate-gradient-wave" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white/95 backdrop-blur-md p-8 rounded-xl shadow-lg w-full max-w-md border border-sky-blue/20"
      >
        <div className="flex justify-center">
          <Building2 className="h-12 w-12 text-sky-blue" />
        </div>

        <h2 className="mt-4 text-center text-3xl font-bold text-gray-800">
          {user
            ? `Welcome, ${user.user_metadata?.full_name || user.email}`
            : isSignUp
            ? 'Sign Up'
            : 'Sign In to ConstructPro'}
        </h2>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="mt-4 text-center text-sm text-coral bg-coral/10 p-2 rounded"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {!user && !showForgotPassword ? (
          <motion.form 
            onSubmit={handleAuth} 
            className="mt-6 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block mb-1 font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full border border-sky-blue/50 bg-white text-gray-800 px-3 py-2 rounded focus:ring-2 focus:ring-sky-blue focus:border-sky-blue transition-colors"
                    placeholder="Enter your full name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block mb-1 font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-sky-blue/50 bg-white text-gray-800 px-3 py-2 rounded focus:ring-2 focus:ring-sky-blue focus:border-sky-blue transition-colors"
                placeholder="your@example.com"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-sky-blue/50 bg-white text-gray-800 px-3 py-2 rounded focus:ring-2 focus:ring-sky-blue focus:border-sky-blue transition-colors"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.05, y: -3, boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-sky-blue text-white font-bold py-2 rounded-lg hover:bg-sky-blue/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </motion.button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-coral hover:underline text-sm"
              >
                Forgot Password?
              </button>
            </div>
          </motion.form>
        ) : !user && showForgotPassword ? (
          <motion.form
            onSubmit={handleForgotPassword}
            className="mt-6 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <label className="block mb-1 font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full border border-sky-blue/50 bg-white text-gray-800 px-3 py-2 rounded focus:ring-2 focus:ring-sky-blue focus:border-sky-blue transition-colors"
                placeholder="your@example.com"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.05, y: -3, boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-sky-blue text-white font-bold py-2 rounded-lg hover:bg-sky-blue/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Send Reset Email'}
            </motion.button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="text-coral hover:underline text-sm"
              >
                Back to Sign In
              </button>
            </div>
          </motion.form>
        ) : (
          <div className="mt-6 text-center">
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05, y: -3, boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-coral text-white font-bold px-4 py-2 rounded-lg hover:bg-coral/90 flex items-center gap-2 mx-auto transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>
          </div>
        )}

        {!user && !showForgotPassword && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp((s) => !s)}
              className="text-coral hover:underline text-sm"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : 'Need an account? Sign Up'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Inline CSS for animations */}
      <style>{`
        .animate-gradient-wave {
          animation: gradientWave 15s infinite ease-in-out;
        }
        @keyframes gradientWave {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

export default LoginForm;