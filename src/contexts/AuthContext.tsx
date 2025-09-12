// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type UserRole = "Admin" | "Project Manager" | "Site Engineer" | "Accounts" | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  permissions: string[];
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRoleAndPermissions = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile role:", profileError.message);
      return;
    }

    if (profile?.role) {
      setUserRole(profile.role as UserRole);

      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("permissions")
        .eq("role_name", profile.role)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching role permissions:", roleError.message);
        return;
      }

      setPermissions(roleData?.permissions ?? []);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session ?? null);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRoleAndPermissions(session.user.id);
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoleAndPermissions(session.user.id);
      } else {
        setUserRole(null);
        setPermissions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      session,
      loading,
      signIn,
      signOut,
    }),
    [user, userRole, permissions, session, loading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};