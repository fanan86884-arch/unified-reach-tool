import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'shift_employee';

const ROLE_CACHE_KEY = 'cached_user_role';

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(() => {
    // Optimistic: read cached role for instant UI
    try {
      const cached = localStorage.getItem(ROLE_CACHE_KEY);
      return (cached as AppRole) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      localStorage.removeItem(ROLE_CACHE_KEY);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (cancelled) return;

        if (error) {
          console.error('Failed to fetch user role:', error);
          setLoading(false);
          return;
        }

        // Prefer admin if user has multiple roles
        const roles = (data || []).map((r) => r.role as AppRole);
        const resolved: AppRole = roles.includes('admin')
          ? 'admin'
          : roles.includes('shift_employee')
          ? 'shift_employee'
          : 'shift_employee'; // Default newly added users to shift_employee

        setRole(resolved);
        try {
          localStorage.setItem(ROLE_CACHE_KEY, resolved);
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === 'admin',
    isShiftEmployee: role === 'shift_employee',
    loading: authLoading || loading,
  };
};
