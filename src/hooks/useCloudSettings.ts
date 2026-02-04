import { useState, useEffect, useCallback } from 'react';
import { SubscriptionType } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useAuth } from './useAuth';

export interface SubscriptionPrices {
  monthly: number;
  quarterly: number;
  'semi-annual': number;
  annual: number;
}

const defaultPrices: SubscriptionPrices = {
  monthly: 250,
  quarterly: 500,
  'semi-annual': 900,
  annual: 1500,
};

export const useCloudSettings = () => {
  const { user } = useAuth();
  const [prices, setPrices] = useState<SubscriptionPrices>(defaultPrices);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        setPrices({
          monthly: Number(data.monthly_price),
          quarterly: Number(data.quarterly_price),
          'semi-annual': Number(data.semi_annual_price),
          annual: Number(data.annual_price),
        });
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
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const savePrices = useCallback(async (newPrices: SubscriptionPrices) => {
    if (!user) return;

    setPrices(newPrices);

    const { error } = await supabase
      .from('settings')
      .update({
        monthly_price: newPrices.monthly,
        quarterly_price: newPrices.quarterly,
        semi_annual_price: newPrices['semi-annual'],
        annual_price: newPrices.annual,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error saving settings:', error);
    }
  }, [user]);

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
