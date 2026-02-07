import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useAuth } from './useAuth';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  is_global: boolean;
  user_id?: string;
}

const defaultTemplates: WhatsAppTemplate[] = [
  {
    id: 'subscription',
    name: 'رسالة الاشتراك',
    content: 'تم الاشتراك في الجيم بتاريخ {تاريخ_الاشتراك} وتم دفع {المبلغ_المدفوع} جنيه والمتبقي {المبلغ_المتبقي} جنيه. ينتهي الاشتراك بتاريخ {تاريخ_الانتهاء}',
    is_global: true,
  },
  {
    id: 'reminder',
    name: 'تذكير بالمبلغ المتبقي',
    content: 'مرحباً {الاسم}، نود تذكيرك بأن لديك مبلغ متبقي {المبلغ_المتبقي} جنيه. يرجى التواصل معنا لتسديد المبلغ.',
    is_global: true,
  },
  {
    id: 'expiry',
    name: 'تنبيه انتهاء الاشتراك',
    content: 'مرحباً {الاسم}، اشتراكك سينتهي بتاريخ {تاريخ_الانتهاء}. يرجى التواصل معنا للتجديد.',
    is_global: true,
  },
  {
    id: 'expired',
    name: 'اشتراك منتهي',
    content: 'مرحباً {الاسم}، انتهى اشتراكك في الجيم. نفتقدك! تواصل معنا لتجديد اشتراكك والعودة للتمرين.',
    is_global: true,
  },
  {
    id: 'paused',
    name: 'اشتراك موقوف',
    content: 'مرحباً {الاسم}، نود أن نخبرك بأنه تم إيقاف اشتراكك لمدة {المدة_المحددة} وأنه سينتهي اشتراكك بتاريخ {تاريخ_الانتهاء}',
    is_global: true,
  },
];

export const useWhatsAppTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(defaultTemplates);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error fetching templates:', error);
        return;
      }

      if (data && data.length > 0) {
        setTemplates(data.map(t => ({
          id: t.id,
          name: t.name,
          content: t.content,
          is_global: t.is_global,
          user_id: t.user_id || undefined,
        })));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_templates',
        },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, content: string) => {
    if (!user) return { success: false, error: 'غير مصرح' };

    // Update locally first
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, content } : t));

    // Update in database - upsert user's override
    const { error } = await supabase
      .from('whatsapp_templates')
      .upsert({
        id: `${id}_user_${user.id}`,
        name: templates.find(t => t.id === id)?.name || '',
        content,
        user_id: user.id,
        is_global: false,
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error updating template:', error);
      return { success: false, error: 'حدث خطأ' };
    }

    return { success: true };
  }, [user, templates]);

  const updateGlobalTemplate = useCallback(async (id: string, content: string) => {
    // Update globally (admin only)
    const { error } = await supabase
      .from('whatsapp_templates')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_global', true);

    if (error) {
      console.error('Error updating global template:', error);
      return { success: false, error: 'حدث خطأ' };
    }

    return { success: true };
  }, []);

  return {
    templates,
    loading,
    updateTemplate,
    updateGlobalTemplate,
    refetch: fetchTemplates,
  };
};
