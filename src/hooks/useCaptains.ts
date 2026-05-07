import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client.runtime';

const CACHE_KEY = 'gym_captains_cache_v2';
const DEFAULT_CAPTAINS = ['كابتن خالد', 'كابتن محمد', 'كابتن أحمد'];

const readCache = (): string[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_CAPTAINS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((c) => typeof c === 'string')) {
      return parsed.length > 0 ? parsed : DEFAULT_CAPTAINS;
    }
    return DEFAULT_CAPTAINS;
  } catch {
    return DEFAULT_CAPTAINS;
  }
};

const writeCache = (captains: string[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(captains));
  } catch {
    // ignore
  }
};

export const useCaptains = () => {
  const [captains, setCaptains] = useState<string[]>(() => readCache());
  const [loading, setLoading] = useState(false);

  const fetchCaptains = useCallback(async () => {
    const { data, error } = await supabase
      .from('captains')
      .select('name')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error loading captains:', error);
      return;
    }
    const list = (data || []).map((r: any) => r.name as string);
    setCaptains(list);
    writeCache(list);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCaptains().finally(() => setLoading(false));

    const channel = supabase
      .channel('captains-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'captains' }, () => {
        fetchCaptains();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCaptains]);

  const addCaptain = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (captains.includes(trimmed)) return false;
    const { error } = await supabase.from('captains').insert({ name: trimmed });
    if (error) {
      console.error('Error adding captain:', error);
      return false;
    }
    return true;
  }, [captains]);

  const removeCaptain = useCallback(async (name: string) => {
    const { error } = await supabase.from('captains').delete().eq('name', name);
    if (error) {
      console.error('Error removing captain:', error);
      return false;
    }
    return true;
  }, []);

  return { captains, loading, addCaptain, removeCaptain };
};
