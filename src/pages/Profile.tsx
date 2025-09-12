import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (user) {
        setUser(user);
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setError(profileError.message);
        } else {
          setProfile(data);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async (updates: any) => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user?.id);

    if (error) {
      setError(error.message);
    } else {
      setProfile({ ...profile, ...updates });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-500">Loading profile...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-500">{error}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Profile</h1>
        {profile && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateProfile({
                full_name: formData.get('full_name'),
                phone: formData.get('phone')
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                name="full_name"
                defaultValue={profile.full_name || ''}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 block w-full border rounded-lg px-3 py-2 bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                name="phone"
                defaultValue={profile.phone || ''}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
