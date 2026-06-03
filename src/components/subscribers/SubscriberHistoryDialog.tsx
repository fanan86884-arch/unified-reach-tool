import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Subscriber } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client.runtime';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Loader2, History, ArrowLeft, Plus, Pencil, RefreshCw, Pause, Play, Archive, ArchiveRestore, Trash2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SubscriberHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber | null;
}

interface LogRow {
  id: string;
  user_id: string;
  action_type: string;
  action_details: Record<string, any> | null;
  previous_data: Record<string, any> | null;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  add: { label: 'إضافة', icon: Plus, color: 'text-success' },
  update: { label: 'تعديل', icon: Pencil, color: 'text-primary' },
  renew: { label: 'تجديد', icon: RefreshCw, color: 'text-success' },
  pause: { label: 'إيقاف', icon: Pause, color: 'text-warning' },
  resume: { label: 'استئناف', icon: Play, color: 'text-success' },
  archive: { label: 'أرشفة', icon: Archive, color: 'text-muted-foreground' },
  restore: { label: 'استعادة', icon: ArchiveRestore, color: 'text-primary' },
  delete: { label: 'حذف', icon: Trash2, color: 'text-destructive' },
};

const FIELD_LABELS: Record<string, string> = {
  name: 'الاسم',
  phone: 'الهاتف',
  subscriptionType: 'نوع الاشتراك',
  startDate: 'بداية الاشتراك',
  endDate: 'نهاية الاشتراك',
  paidAmount: 'المدفوع',
  remainingAmount: 'المتبقي',
  captain: 'الكابتن',
  gender: 'النوع',
  subscriptionCategory: 'الفئة',
};

const DATE_FIELDS = new Set(['startDate', 'endDate']);

const formatValue = (key: string, val: any): string => {
  if (val === null || val === undefined || val === '') return '—';
  if (DATE_FIELDS.has(key)) {
    try { return format(parseISO(String(val)), 'dd/MM/yyyy'); } catch { return String(val); }
  }
  return String(val);
};

export const SubscriberHistoryDialog = ({ isOpen, onClose, subscriber }: SubscriberHistoryDialogProps) => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !subscriber) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('activity_log')
          .select('id, user_id, action_type, action_details, previous_data, created_at')
          .eq('subscriber_id', subscriber.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (cancelled) return;
        const rows = (data || []) as LogRow[];
        setLogs(rows);

        const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
        if (userIds.length) {
          const { data: caps } = await supabase
            .from('captain_accounts')
            .select('user_id, captain_name')
            .in('user_id', userIds);
          const map: Record<string, string> = {};
          (caps || []).forEach((c: any) => { map[c.user_id] = c.captain_name; });
          if (!cancelled) setUserMap(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, subscriber]);

  if (!subscriber) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            سجل تغييرات {subscriber.name}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6 scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              لا توجد تغييرات مسجلة لهذا المشترك بعد.
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {logs.map((log) => {
                const meta = ACTION_META[log.action_type] || { label: log.action_type, icon: Pencil, color: 'text-muted-foreground' };
                const Icon = meta.icon;
                const editor = userMap[log.user_id] || 'الإدارة';

                // Build diff entries
                const diffs: { key: string; from: any; to: any }[] = [];
                const prev = log.previous_data || {};
                const details = log.action_details || {};

                if (log.action_type === 'update') {
                  Object.keys(details).forEach((k) => {
                    if (k in FIELD_LABELS && prev[k] !== details[k]) {
                      diffs.push({ key: k, from: prev[k], to: details[k] });
                    }
                  });
                } else if (log.action_type === 'renew') {
                  if (details.previousEndDate || details.newEndDate) {
                    diffs.push({ key: 'endDate', from: details.previousEndDate, to: details.newEndDate });
                  }
                  if (details.paidAmount !== undefined) {
                    diffs.push({ key: 'paidAmount', from: 0, to: details.paidAmount });
                  }
                } else if (log.action_type === 'add') {
                  if (details.subscriptionType) diffs.push({ key: 'subscriptionType', from: '—', to: details.subscriptionType });
                  if (details.paidAmount !== undefined) diffs.push({ key: 'paidAmount', from: '—', to: details.paidAmount });
                }

                return (
                  <div key={log.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                        <Badge variant="secondary" className="text-[11px]">{meta.label}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground" dir="ltr">
                        {format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>بواسطة: {editor}</span>
                    </div>

                    {diffs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {diffs.map((d, i) => (
                          <div key={i} className="text-xs flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground min-w-[80px]">{FIELD_LABELS[d.key] || d.key}:</span>
                            <span className="text-destructive line-through">{formatValue(d.key, d.from)}</span>
                            <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                            <span className="font-semibold text-success">{formatValue(d.key, d.to)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
