import { useState, useEffect, useCallback } from 'react';
import { SubscriptionType, Gender, SubscriptionCategory } from '@/types/subscriber';
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

export type PricingTiers = Record<Gender, Record<SubscriptionCategory, SubscriptionPrices>>;

const SETTINGS_CACHE_KEY = 'offline_settings_prices';
const PRICING_TIERS_CACHE_KEY = 'offline_pricing_tiers';

const defaultPrices: SubscriptionPrices = {
  monthly: 250,
  quarterly: 500,
  'semi-annual': 900,
  annual: 1500,
};

const defaultPricingTiers: PricingTiers = {
  male: {
    gym: { monthly: 250, quarterly: 700, 'semi-annual': 1300, annual: 2400 },
    gym_walking: { monthly: 350, quarterly: 950, 'semi-annual': 1800, annual: 3300 },
    walking: { monthly: 150, quarterly: 400, 'semi-annual': 750, annual: 1400 },
  },
  female: {
    gym: { monthly: 300, quarterly: 850, 'semi-annual': 1600, annual: 2900 },
    gym_walking: { monthly: 400, quarterly: 1100, 'semi-annual': 2050, annual: 3800 },
    walking: { monthly: 200, quarterly: 550, 'semi-annual': 1000, annual: 1850 },
  },
};

const getLegacyCachedPrices = (): SubscriptionPrices | null => {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getLegacyCachedTiers = (): PricingTiers | null => {
  try {
    const raw = localStorage.getItem(PRICING_TIERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const cachePricesLegacy = (prices: SubscriptionPrices) => {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(prices));
};

const cacheTiersLegacy = (tiers: PricingTiers) => {
  localStorage.setItem(PRICING_TIERS_CACHE_KEY, JSON.stringify(tiers));
};

export const useCloudSettings = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [prices, setPrices] = useState<SubscriptionPrices>(() => getLegacyCachedPrices() || defaultPrices);
  const [pricingTiers, setPricingTiers] = useState<PricingTiers>(() => getLegacyCachedTiers() || defaultPricingTiers);
  const [loading, setLoading] = useState(true);

  // Load from IndexedDB on mount
  useEffect(() => {
    (async () => {
      const cached = await getCachedSettings();
      if (cached?.prices) setPrices(cached.prices);
      if ((cached as any)?.pricingTiers) setPricingTiers((cached as any).pricingTiers);
    })();
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setLoading(false);
      return;
    }

    try {
      // Read GLOBAL pricing tiers from any settings row (shared across all accounts)
      // Prefer current user's row for prices, but pricing_tiers are shared
      const [{ data: ownData }, { data: anyData }] = await Promise.all([
        supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('settings').select('pricing_tiers, updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const data = ownData;
      const globalTiers = ((anyData as any)?.pricing_tiers as PricingTiers) || ((ownData as any)?.pricing_tiers as PricingTiers);

      if (data) {
        const fetched: SubscriptionPrices = {
          monthly: Number(data.monthly_price),
          quarterly: Number(data.quarterly_price),
          'semi-annual': Number(data.semi_annual_price),
          annual: Number(data.annual_price),
        };
        setPrices(fetched);
        cachePricesLegacy(fetched);

        const tiers = globalTiers || defaultPricingTiers;
        setPricingTiers(tiers);
        cacheTiersLegacy(tiers);
        await setCachedSettings({ prices: fetched, pricingTiers: tiers } as any);
      } else {
        const { error: insertError } = await supabase
          .from('settings')
          .insert({
            user_id: user.id,
            monthly_price: defaultPrices.monthly,
            quarterly_price: defaultPrices.quarterly,
            semi_annual_price: defaultPrices['semi-annual'],
            annual_price: defaultPrices.annual,
          });
        if (insertError) console.error('Error creating settings:', insertError);
        cachePricesLegacy(defaultPrices);
        cacheTiersLegacy(defaultPricingTiers);
        await setCachedSettings({ prices: defaultPrices, pricingTiers: defaultPricingTiers } as any);
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
    await setCachedSettings({ prices: newPrices, pricingTiers } as any);

    if (!user) return;

    const updateData = {
      monthly_price: newPrices.monthly,
      quarterly_price: newPrices.quarterly,
      semi_annual_price: newPrices['semi-annual'],
      annual_price: newPrices.annual,
    };

    if (!isOnline) {
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
    if (error) console.error('Error saving settings:', error);
  }, [user, isOnline, pricingTiers]);

  const savePricingTiers = useCallback(async (newTiers: PricingTiers) => {
    setPricingTiers(newTiers);
    cacheTiersLegacy(newTiers);
    await setCachedSettings({ prices, pricingTiers: newTiers } as any);

    if (!user) return;

    if (!isOnline) {
      await addPendingSettingsChange({
        id: crypto.randomUUID(),
        entity: 'settings',
        data: { pricing_tiers: newTiers },
        timestamp: Date.now(),
      });
      return;
    }

    const { error } = await supabase
      .from('settings')
      .update({ pricing_tiers: newTiers } as any)
      .eq('user_id', user.id);
    if (error) console.error('Error saving pricing tiers:', error);
  }, [user, isOnline, prices]);

  const getPrice = useCallback(
    (type: SubscriptionType, gender?: Gender, category?: SubscriptionCategory): number => {
      if (gender && category) {
        return pricingTiers?.[gender]?.[category]?.[type] ?? prices[type];
      }
      return prices[type];
    },
    [prices, pricingTiers]
  );

  const calculateRemaining = useCallback(
    (type: SubscriptionType, paidAmount: number, gender?: Gender, category?: SubscriptionCategory): number => {
      const price = getPrice(type, gender, category);
      return Math.max(0, price - paidAmount);
    },
    [getPrice]
  );

  return {
    prices,
    pricingTiers,
    loading,
    savePrices,
    savePricingTiers,
    getPrice,
    calculateRemaining,
  };
};
