import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { buildCallLink, buildWhatsAppLink } from '@/lib/phone';
import { useOnlineStatus } from './useOnlineStatus';
import { getCachedContacts, setCachedContacts, addPendingSettingsChange } from '@/lib/offlineStore';

export interface ContactInfo {
  facebookUrl: string;
  instagramUrl: string;
  captains: {
    name: string;
    phone: string;
  }[];
}

const defaultContactInfo: ContactInfo = {
  facebookUrl: 'https://www.facebook.com/share/1Evxng2Gyf/?mibextid=wwXIfr',
  instagramUrl: '',
  captains: [
    { name: 'الكابتن محمد', phone: '01002690364' },
    { name: 'الكابتن خالد', phone: '01127353006' },
  ],
};

export const useContactSettings = () => {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(defaultContactInfo);
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

  // Load from IndexedDB cache on mount
  useEffect(() => {
    (async () => {
      const cached = await getCachedContacts();
      if (cached) {
        setContactInfo(cached as ContactInfo);
      }
    })();
  }, []);

  // Fetch contact settings from Supabase
  const fetchContactSettings = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contact_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contact settings:', error);
        return;
      }

      if (data) {
        const info: ContactInfo = {
          facebookUrl: data.facebook_url || '',
          instagramUrl: data.instagram_url || '',
          captains: (data.captains as { name: string; phone: string }[]) || [],
        };
        setContactInfo(info);
        await setCachedContacts(info);
      }
    } catch (e) {
      console.error('Error loading contact settings:', e);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchContactSettings();
  }, [fetchContactSettings]);

  // Realtime subscription for contact settings
  useEffect(() => {
    const channel = supabase
      .channel('contact-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_settings',
        },
        () => {
          fetchContactSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContactSettings]);

  const saveContactInfo = useCallback(async (newInfo: ContactInfo) => {
    // Always update local state and cache immediately
    setContactInfo(newInfo);
    await setCachedContacts(newInfo);

    const dbData = {
      facebook_url: newInfo.facebookUrl,
      instagram_url: newInfo.instagramUrl,
      captains: newInfo.captains,
    };

    if (!isOnline) {
      // Queue for later sync
      await addPendingSettingsChange({
        id: crypto.randomUUID(),
        entity: 'contacts',
        data: dbData,
        timestamp: Date.now(),
      });
      return true;
    }

    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('contact_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('contact_settings')
          .update(dbData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contact_settings')
          .insert(dbData);
        if (error) throw error;
      }

      return true;
    } catch (e) {
      console.error('Error saving contact settings:', e);
      return false;
    }
  }, [isOnline]);

  const getWhatsAppLink = useCallback((phone: string): string => {
    return buildWhatsAppLink(phone);
  }, []);

  const getCallLink = useCallback((phone: string): string => {
    return buildCallLink(phone);
  }, []);

  return {
    contactInfo,
    loading,
    saveContactInfo,
    getWhatsAppLink,
    getCallLink,
  };
};
