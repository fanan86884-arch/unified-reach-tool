export type SubscriptionStatus = 'active' | 'expiring' | 'expired' | 'pending' | 'paused';

export type SubscriptionType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export type Gender = 'male' | 'female';

export type SubscriptionCategory = 'gym' | 'gym_walking' | 'walking';

export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  subscriptionType: SubscriptionType;
  startDate: string;
  endDate: string;
  paidAmount: number;
  remainingAmount: number;
  captain: string;
  status: SubscriptionStatus;
  isArchived: boolean;
  isPaused: boolean;
  pausedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  gender?: Gender;
  subscriptionCategory?: SubscriptionCategory;
  addedByUserId?: string;
}

export interface SubscriberFormData {
  name: string;
  phone: string;
  subscriptionType: SubscriptionType;
  startDate: string;
  endDate: string;
  paidAmount: number;
  remainingAmount: number;
  captain: string;
  gender: Gender;
  subscriptionCategory: SubscriptionCategory;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
}
