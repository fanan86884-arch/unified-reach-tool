import { useState, useEffect } from 'react';
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

  const savePrices = (newPrices: SubscriptionPrices) => {
    setPrices(newPrices);
    const settings = { prices: newPrices };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  };

  const getPrice = (type: SubscriptionType): number => {
    return prices[type];
  };

  const calculateRemaining = (type: SubscriptionType, paidAmount: number): number => {
    const total = prices[type];
    return Math.max(0, total - paidAmount);
  };

  return {
    prices,
    savePrices,
    getPrice,
    calculateRemaining,
  };
};
