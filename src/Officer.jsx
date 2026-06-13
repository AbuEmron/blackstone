import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "./supabase.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid) {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadProfile(s?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = {
    session,
    profile,
    loading,
    role: profile?.role ?? null,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, full_name) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name } } }),
    signOut: () => supabase.auth.signOut(),
    refresh: () => loadProfile(session?.user?.id),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function ProtectedRoute({ allow, children }) {
  const { session, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-steel font-mono text-xs tracking-widest">
        SECURING SESSION…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (allow && profile && !allow.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
