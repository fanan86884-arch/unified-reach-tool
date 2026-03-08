import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useAuth } from '@/hooks/useAuth';
import { Subscriber } from '@/types/subscriber';
import { cn } from '@/lib/utils';

interface VipClientsProps {
  allSubscribers: Subscriber[];
}

interface VipInfo {
  subscriberId: string;
  name: string;
  consecutiveMonths: number;
  isVip: boolean;
}

const VIP_THRESHOLD = 10;

export const VipClients = ({ allSubscribers }: VipClientsProps) => {
  const { user } = useAuth();
  const [vipData, setVipData] = useState<VipInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchRenewals = async () => {
      const { data, error } = await supabase
        .from('renewal_history')
        .select('subscriber_id, renewed_at')
        .eq('user_id', user.id)
        .order('renewed_at', { ascending: true });

      if (error || !data) {
        setLoading(false);
        return;
      }

      // Group renewals by subscriber
      const bySubscriber: Record<string, string[]> = {};
      data.forEach((r: any) => {
        if (!bySubscriber[r.subscriber_id]) bySubscriber[r.subscriber_id] = [];
        bySubscriber[r.subscriber_id].push(r.renewed_at);
      });

      // Calculate consecutive months for each subscriber
      const results: VipInfo[] = [];
      for (const [subId, dates] of Object.entries(bySubscriber)) {
        const sub = allSubscribers.find(s => s.id === subId);
        if (!sub) continue;

        // Count total renewals as consecutive months (each renewal = 1 month)
        const consecutiveMonths = dates.length;
        
        results.push({
          subscriberId: subId,
          name: sub.name,
          consecutiveMonths,
          isVip: consecutiveMonths >= VIP_THRESHOLD,
        });
      }

      // Sort: VIP first, then by months desc
      results.sort((a, b) => {
        if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
        return b.consecutiveMonths - a.consecutiveMonths;
      });

      setVipData(results);
      setLoading(false);
    };

    fetchRenewals();
  }, [user, allSubscribers]);

  const vipClients = vipData.filter(v => v.isVip);
  const nearVipClients = vipData.filter(v => !v.isVip && v.consecutiveMonths >= 5);

  if (loading) return null;
  if (vipData.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold flex items-center gap-2">
        <Crown className="w-4 h-4 text-yellow-500" />
        العملاء المميزون
      </h4>

      {vipClients.length > 0 && (
        <div className="space-y-2">
          {vipClients.map(v => (
            <div key={v.subscriberId} className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-sm">{v.name}</span>
              </div>
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                ⭐ عميل مميز ({v.consecutiveMonths} شهر)
              </span>
            </div>
          ))}
        </div>
      )}

      {nearVipClients.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">قريبون من التميز:</p>
          {nearVipClients.map(v => (
            <div key={v.subscriberId} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <span className="font-medium text-sm">{v.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${(v.consecutiveMonths / VIP_THRESHOLD) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {VIP_THRESHOLD - v.consecutiveMonths} شهور متبقية
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
