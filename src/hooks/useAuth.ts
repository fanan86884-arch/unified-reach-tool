import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client.runtime';

const OFFLINE_AUTH_USER_KEY = 'offline_auth_user';

const cacheUser = (user: User | null) => {
  if (!user) {
    localStorage.removeItem(OFFLINE_AUTH_USER_KEY);
    return;
  }

  localStorage.setItem(
    OFFLINE_AUTH_USER_KEY,
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      aud: user.aud,
      created_at: user.created_at,
    })
  );
};

const getCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(OFFLINE_AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        cacheUser(currentUser);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        setUser(session.user);
        cacheUser(session.user);
      } else {
        const cachedUser = !navigator.onLine ? getCachedUser() : null;
        setUser(cachedUser);
      }

      setLoading(false);
    }).catch(() => {
      // Offline — restore cached auth to allow full offline app boot
      const cachedUser = getCachedUser();
      setUser(cachedUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem(OFFLINE_AUTH_USER_KEY);
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
};
