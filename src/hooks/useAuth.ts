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
    let settled = false;

    const settle = (u: User | null, s: Session | null) => {
      if (settled) return;
      settled = true;
      setUser(u);
      setSession(s);
      setLoading(false);
    };

    // If offline, resolve immediately from cache — don't wait for network
    if (!navigator.onLine) {
      const cached = getCachedUser();
      settle(cached, null);
      // Still set up listener for when we come back online
    }

    // Hard timeout: never stay loading longer than 3 seconds
    const timeout = setTimeout(() => {
      if (!settled) {
        const cached = getCachedUser();
        settle(cached, null);
      }
    }, 3000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;

        // Keep cached auth while offline even if runtime session is missing
        if (!currentUser && !navigator.onLine) {
          const cached = getCachedUser();
          setUser(cached);
          setSession(null);
          if (!settled) {
            settled = true;
            setLoading(false);
          }
          return;
        }

        setUser(currentUser);
        setSession(session);
        cacheUser(currentUser);
        if (!settled) {
          settled = true;
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        cacheUser(session.user);
        settle(session.user, session);
      } else if (!settled) {
        // Always use cached auth as fallback to avoid forced login in offline-first mode
        const cached = getCachedUser();
        settle(cached, null);
      }
    }).catch(() => {
      // Network error — restore cached auth
      const cached = getCachedUser();
      settle(cached, null);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
