import { useState, useEffect, useCallback } from 'react';
import { SubscriptionType } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { getCachedSettings, setCachedSettings, addPendingSettingsChange } from '@/lib/offlineStore';

export interface SubscriptionPrices {
  monthly: number;
  quarterly: number;
  'semi-annual': number;
  annual: number;
}

const SETTINGS_CACHE_KEY = 'offline_settings_prices';

const defaultPrices: SubscriptionPrices = {
  monthly: 250,
  quarterly: 500,
  'semi-annual': 900,
  annual: 1500,
};

// Legacy localStorage cache for instant startup
const getLegacyCachedPrices = (): SubscriptionPrices | null => {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const cachePricesLegacy = (prices: SubscriptionPrices) => {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(prices));
};

export const useCloudSettings = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [prices, setPrices] = useState<SubscriptionPrices>(() => getLegacyCachedPrices() || defaultPrices);
  const [loading, setLoading] = useState(true);

  // Load from IndexedDB on mount (more reliable than localStorage for long-term)
  useEffect(() => {
    (async () => {
      const cached = await getCachedSettings();
      if (cached?.prices) {
        setPrices(cached.prices);
      }
    })();
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // If offline, use cached prices immediately
    if (!isOnline) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const fetched: SubscriptionPrices = {
          monthly: Number(data.monthly_price),
          quarterly: Number(data.quarterly_price),
          'semi-annual': Number(data.semi_annual_price),
          annual: Number(data.annual_price),
        };
        setPrices(fetched);
        cachePricesLegacy(fetched);
        await setCachedSettings({ prices: fetched });
      } else {
        // Create default settings for new user
        const { error: insertError } = await supabase
          .from('settings')
          .insert({
            user_id: user.id,
            monthly_price: defaultPrices.monthly,
            quarterly_price: defaultPrices.quarterly,
            semi_annual_price: defaultPrices['semi-annual'],
            annual_price: defaultPrices.annual,
          });

        if (insertError) {
          console.error('Error creating settings:', insertError);
        }
        cachePricesLegacy(defaultPrices);
        await setCachedSettings({ prices: defaultPrices });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const savePrices = useCallback(async (newPrices: SubscriptionPrices) => {
    setPrices(newPrices);
    cachePricesLegacy(newPrices);
    await setCachedSettings({ prices: newPrices });

    if (!user) return;

    const updateData = {
      monthly_price: newPrices.monthly,
      quarterly_price: newPrices.quarterly,
      semi_annual_price: newPrices['semi-annual'],
      annual_price: newPrices.annual,
    };

    if (!isOnline) {
      // Queue for later sync
      await addPendingSettingsChange({
        id: crypto.randomUUID(),
        entity: 'settings',
        data: updateData,
        timestamp: Date.now(),
      });
      return;
    }

    const { error } = await supabase
      .from('settings')
      .update(updateData)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error saving settings:', error);
    }
  }, [user, isOnline]);

  const getPrice = useCallback(
    (type: SubscriptionType): number => {
      return prices[type];
    },
    [prices]
  );

  const calculateRemaining = useCallback(
    (type: SubscriptionType, paidAmount: number): number => {
      return Math.max(0, prices[type] - paidAmount);
    },
    [prices]
  );

  return {
    prices,
    loading,
    savePrices,
    getPrice,
    calculateRemaining,
  };
};
