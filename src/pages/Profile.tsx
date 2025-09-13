import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Define the Profile type based on your table structure
type Profile = {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  location?: string;
  gst_number?: string;
  website?: string;
  instagram?: string;
  subscription_type?: string;
};

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (user) {
        setUser(user);

        const { data, error: profileError } = await supabase
          .from<Profile>('profiles')
          .select('id, full_name, email, phone, company, role, location, gst_number, website, instagram, subscription_type')
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

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase
      .from<Profile>('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      setError(error.message);
    } else {
      setProfile((prev) => ({ ...prev, ...updates }));
      setIsEditing(false); // Exit edit mode after successful save
    }

    setLoading(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Optionally reload the profile to revert unsaved changes
    fetchProfile();
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
                full_name: formData.get('full_name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                company: formData.get('company') as string,
                role: formData.get('role') as string,
                location: formData.get('location') as string,
                gst_number: formData.get('gst_number') as string,
                website: formData.get('website') as string,
                instagram: formData.get('instagram') as string,
                subscription_type: formData.get('subscription_type') as string,
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
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                defaultValue={profile.email || user?.email || ''}
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
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                name="company"
                defaultValue={profile.company || ''}
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <input
                type="text"
                name="role"
                defaultValue={profile.role || ''}
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                name="location"
                defaultValue={profile.location || ''}
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">GST Number</label>
              <input
                type="text"
                name="gst_number"
                defaultValue={profile.gst_number || ''}
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <input
                type="text"
                name="website"
                defaultValue={profile.website || ''}
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Instagram</label>
              <input
                type="text"
                name="instagram"
                defaultValue={profile.instagram || ''}
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subscription Type</label>
              <input
                type="text"
                name="subscription_type"
                defaultValue={profile.subscription_type || 'Free'}
                disabled={!isEditing}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}