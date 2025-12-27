import { useState, useEffect, useCallback } from 'react';
import { SubscriptionType } from '@/types/subscriber';

export interface SubscriptionPrices {
  monthly: number;
  quarterly: number;
  'semi-annual': number;
  annual: number;
}

const SETTINGS_KEY = 'gym_settings';

const defaultPrices: SubscriptionPrices = {
  monthly: 200,
  quarterly: 500,
  'semi-annual': 900,
  annual: 1500,
};

export const useSettings = () => {
  const [prices, setPrices] = useState<SubscriptionPrices>(defaultPrices);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.prices) {
          setPrices(parsed.prices);
        }
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  const savePrices = useCallback((newPrices: SubscriptionPrices) => {
    setPrices(newPrices);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ prices: newPrices }));
  }, []);

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
    savePrices,
    getPrice,
    calculateRemaining,
  };
};

