export type SubscriptionStatus = 'active' | 'expiring' | 'expired' | 'pending';

export type SubscriptionType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

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
  createdAt: string;
  updatedAt: string;
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
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
}
