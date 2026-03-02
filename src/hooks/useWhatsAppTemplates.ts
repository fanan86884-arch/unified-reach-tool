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

const templateBaseId = (id: string) => id.replace(/_user_[a-z0-9-]+$/i, '');

export const useWhatsAppTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(defaultTemplates);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setTemplates(defaultTemplates);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .or(`is_global.eq.true,user_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching templates:', error);
        return;
      }

      const globalById = new Map<string, WhatsAppTemplate>();
      const userById = new Map<string, WhatsAppTemplate>();

      for (const t of data || []) {
        const baseId = templateBaseId(t.id);
        const normalizedTemplate: WhatsAppTemplate = {
          id: baseId,
          name: t.name,
          content: t.content,
          is_global: t.is_global,
          user_id: t.user_id || undefined,
        };

        if (t.user_id === user.id) {
          userById.set(baseId, normalizedTemplate);
        } else if (t.is_global) {
          globalById.set(baseId, normalizedTemplate);
        }
      }

      const merged = defaultTemplates.map((template) => {
        return userById.get(template.id) ?? globalById.get(template.id) ?? template;
      });

      // Keep any extra custom user templates that aren't in defaults
      for (const [id, template] of userById.entries()) {
        if (!merged.some((m) => m.id === id)) {
          merged.push(template);
        }
      }

      setTemplates(merged);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

    const previous = templates;
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));

    const fallbackName = defaultTemplates.find((t) => t.id === id)?.name || templates.find((t) => t.id === id)?.name || 'رسالة';

    const { error } = await supabase
      .from('whatsapp_templates')
      .upsert(
        {
          id: `${id}_user_${user.id}`,
          name: fallbackName,
          content,
          user_id: user.id,
          is_global: false,
        },
        {
          onConflict: 'id',
        }
      );

    if (error) {
      console.error('Error updating template:', error);
      setTemplates(previous);
      return { success: false, error: 'حدث خطأ' };
    }

    return { success: true };
  }, [user, templates]);

  // Kept for backwards compatibility in settings; persists per user and syncs on all user devices
  const updateGlobalTemplate = useCallback(async (id: string, content: string) => {
    return updateTemplate(id, content);
  }, [updateTemplate]);

  return {
    templates,
    loading,
    updateTemplate,
    updateGlobalTemplate,
    refetch: fetchTemplates,
  };
};
