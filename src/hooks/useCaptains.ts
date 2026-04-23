import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'gym_captains_list_v1';
const DEFAULT_CAPTAINS = ['كابتن خالد', 'كابتن محمد', 'كابتن أحمد'];

const readStorage = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

const writeStorage = (captains: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(captains));
    window.dispatchEvent(new CustomEvent('captains-updated'));
  } catch {
    // ignore
  }
};

export const useCaptains = () => {
  const [captains, setCaptains] = useState<string[]>(() => readStorage());

  useEffect(() => {
    const refresh = () => setCaptains(readStorage());
    window.addEventListener('captains-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('captains-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const addCaptain = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const current = readStorage();
    if (current.includes(trimmed)) return false;
    const next = [...current, trimmed];
    writeStorage(next);
    setCaptains(next);
    return true;
  }, []);

  const removeCaptain = useCallback((name: string) => {
    const current = readStorage();
    const next = current.filter((c) => c !== name);
    writeStorage(next);
    setCaptains(next);
  }, []);

  return { captains, addCaptain, removeCaptain };
};
