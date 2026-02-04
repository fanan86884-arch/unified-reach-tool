import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useAuth } from './useAuth';
import { Subscriber } from '@/types/subscriber';

export interface ActivityLog {
  id: string;
  subscriberId: string | null;
  subscriberName: string;
  actionType: string;
  actionDetails: Record<string, any> | null;
  previousData: Partial<Subscriber> | null;
  createdAt: string;
}

const actionTypeLabels: Record<string, string> = {
  add: 'إضافة مشترك',
  update: 'تعديل بيانات',
  delete: 'حذف مشترك',
  archive: 'أرشفة مشترك',
  restore: 'استعادة من الأرشيف',
  renew: 'تجديد اشتراك',
  pause: 'إيقاف اشتراك',
  resume: 'استئناف اشتراك',
};

export const getActionLabel = (actionType: string): string => {
  return actionTypeLabels[actionType] || actionType;
};

export const useActivityLog = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching activity logs:', error);
        return;
      }

      const mapped: ActivityLog[] = (data || []).map((row: any) => ({
        id: row.id,
        subscriberId: row.subscriber_id,
        subscriberName: row.subscriber_name,
        actionType: row.action_type,
        actionDetails: row.action_details,
        previousData: row.previous_data,
        createdAt: row.created_at,
      }));

      setLogs(mapped);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addLog = useCallback(async (
    subscriberId: string | null,
    subscriberName: string,
    actionType: string,
    actionDetails?: Record<string, any>,
    previousData?: Partial<Subscriber>
  ) => {
    if (!user) return;

    const { error } = await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        subscriber_id: subscriberId,
        subscriber_name: subscriberName,
        action_type: actionType,
        action_details: actionDetails || null,
        previous_data: previousData || null,
      });

    if (error) {
      console.error('Error adding activity log:', error);
    } else {
      fetchLogs();
    }
  }, [user, fetchLogs]);

  const revertChange = useCallback(async (log: ActivityLog): Promise<boolean> => {
    if (!user || !log.previousData || !log.subscriberId) return false;

    try {
      const updateData: any = {};
      const prev = log.previousData as any;

      if (prev.name !== undefined) updateData.name = prev.name;
      if (prev.phone !== undefined) updateData.phone = prev.phone;
      if (prev.subscriptionType !== undefined) updateData.subscription_type = prev.subscriptionType;
      if (prev.startDate !== undefined) updateData.start_date = prev.startDate;
      if (prev.endDate !== undefined) updateData.end_date = prev.endDate;
      if (prev.paidAmount !== undefined) updateData.paid_amount = prev.paidAmount;
      if (prev.remainingAmount !== undefined) updateData.remaining_amount = prev.remainingAmount;
      if (prev.captain !== undefined) updateData.captain = prev.captain;
      if (prev.status !== undefined) updateData.status = prev.status;
      if (prev.isArchived !== undefined) updateData.is_archived = prev.isArchived;
      if (prev.isPaused !== undefined) updateData.is_paused = prev.isPaused;
      if (prev.pausedUntil !== undefined) updateData.paused_until = prev.pausedUntil;

      const { error } = await supabase
        .from('subscribers')
        .update(updateData)
        .eq('id', log.subscriberId);

      if (error) {
        console.error('Error reverting change:', error);
        return false;
      }

      // Log the revert action
      await addLog(
        log.subscriberId,
        log.subscriberName,
        'revert',
        { revertedAction: log.actionType, revertedLogId: log.id }
      );

      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  }, [user, addLog]);

  const clearLogs = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('activity_log')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing logs:', error);
        return false;
      }
      
      setLogs([]);
      return true;
    } catch (err) {
      console.error('Error:', err);
      return false;
    }
  }, [user]);

  return {
    logs,
    loading,
    addLog,
    revertChange,
    clearLogs,
    refetch: fetchLogs,
  };
};
