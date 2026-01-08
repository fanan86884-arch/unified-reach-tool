import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SubscriptionRequest {
  id: string;
  name: string;
  phone: string;
  subscription_type: string;
  start_date: string;
  end_date: string;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string | null;
  status: string;
  created_at: string;
}

interface MemberRequestsHistoryProps {
  phone: string;
}

const subscriptionLabels: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

const statusConfig = {
  pending: { label: 'قيد الانتظار', icon: Clock, className: 'bg-warning/10 text-warning border-warning/30' },
  approved: { label: 'تم القبول', icon: CheckCircle, className: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'مرفوض', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export const MemberRequestsHistory = ({ phone }: MemberRequestsHistoryProps) => {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      
      // Clean phone number for comparison
      const cleanPhone = phone.replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('subscription_requests')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.0${cleanPhone},phone.ilike.%${cleanPhone.slice(-10)}`)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setRequests(data);
      }
      
      setLoading(false);
    };

    if (phone) {
      fetchRequests();
    }
  }, [phone]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
        const StatusIcon = status.icon;

        return (
          <Card key={request.id} className="p-4 border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('w-4 h-4', status.className.split(' ')[1])} />
                <span className="font-medium">
                  {subscriptionLabels[request.subscription_type] || request.subscription_type}
                </span>
              </div>
              <Badge className={cn('border', status.className)}>
                {status.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">تاريخ الطلب:</span>
                <p className="font-medium">
                  {format(parseISO(request.created_at), 'dd/MM/yyyy', { locale: ar })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">تاريخ البداية:</span>
                <p className="font-medium">
                  {format(parseISO(request.start_date), 'dd/MM/yyyy', { locale: ar })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">المبلغ المدفوع:</span>
                <p className="font-medium text-success">{request.paid_amount} جنيه</p>
              </div>
              {request.remaining_amount > 0 && (
                <div>
                  <span className="text-muted-foreground">المتبقي:</span>
                  <p className="font-medium text-destructive">{request.remaining_amount} جنيه</p>
                </div>
              )}
            </div>

            {request.payment_method && (
              <p className="text-xs text-muted-foreground mt-2">
                طريقة الدفع: {request.payment_method}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
};
