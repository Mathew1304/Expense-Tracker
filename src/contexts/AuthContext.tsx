// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type UserRole = string | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  permissions: string[];
  profile: any;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user profile and corresponding role permissions
   */
  const fetchUserRoleAndPermissions = async (userId: string) => {
    try {
      // ✅ Fetch user profile safely
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, email")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        return;
      }

      if (!profileData) {
        console.warn("No profile found for user:", userId);
        setPermissions([]);
        setProfile(null);
        return;
      }

      setProfile(profileData);

      // ✅ If profile has a role, fetch its permissions
      if (profileData?.role) {
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("permissions")
          .eq("role_name", profileData.role)
          .eq("is_active", true)
          .order("created_at", { ascending: false }) // ensure we get latest role
          .limit(1)
          .single(); // fetch exactly one row safely

        if (roleError) {
          console.error("Error fetching role permissions:", roleError.message);
          setPermissions([]);
          return;
        }

        setUserRole(profileData.role);
        setPermissions(roleData?.permissions ?? []);
      } else {
        setUserRole(null);
        setPermissions([]);
      }
    } catch (err) {
      console.error("Error fetching role and permissions:", err);
    }
  };

  /**
   * Initialize session and listen for auth state changes
   */
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session ?? null);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRoleAndPermissions(session.user.id);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoleAndPermissions(session.user.id);
      } else {
        setUserRole(null);
        setPermissions([]);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Auth methods
   */
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      userRole,
      permissions,
      profile,
      session,
      loading,
      signIn,
      signOut,
    }),
    [user, userRole, permissions, profile, session, loading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

/**
 * Hook for consuming auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
