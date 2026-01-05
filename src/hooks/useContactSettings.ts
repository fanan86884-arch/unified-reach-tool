import { useState, useEffect, useCallback } from 'react';

export interface ContactInfo {
  facebookUrl: string;
  instagramUrl: string;
  captains: {
    name: string;
    phone: string;
  }[];
}

const CONTACT_SETTINGS_KEY = 'contact_settings';

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

  useEffect(() => {
    const stored = localStorage.getItem(CONTACT_SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setContactInfo({ ...defaultContactInfo, ...parsed });
      } catch (e) {
        console.error('Error loading contact settings:', e);
      }
    }
  }, []);

  const saveContactInfo = useCallback((newInfo: ContactInfo) => {
    setContactInfo(newInfo);
    localStorage.setItem(CONTACT_SETTINGS_KEY, JSON.stringify(newInfo));
  }, []);

  const getWhatsAppLink = useCallback((phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('20') ? cleanPhone : `20${cleanPhone}`;
    return `https://wa.me/${formattedPhone}`;
  }, []);

  return {
    contactInfo,
    saveContactInfo,
    getWhatsAppLink,
  };
};
