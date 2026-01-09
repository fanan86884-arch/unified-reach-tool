import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Salad, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toEnglishDigits } from '@/lib/phone';

interface DietRequest {
  id: string;
  name: string;
  phone: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
  sleep_time: string;
  wake_time: string;
  meals_count: number;
  status: string;
  admin_response: string | null;
  created_at: string;
}

interface DietRequestsHistoryProps {
  phone: string;
}

const statusConfig = {
  pending: { label: 'قيد الانتظار', icon: Clock, className: 'bg-warning/10 text-warning border-warning/30' },
  responded: { label: 'تم الرد', icon: CheckCircle, className: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'مرفوض', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const goalLabels: Record<string, string> = {
  weight_loss: 'خسارة وزن',
  maintain: 'ثبات الوزن',
  muscle_gain: 'زيادة كتلة عضلية',
};

const activityLabels: Record<string, string> = {
  sedentary: 'خامل',
  moderate: 'متوسط',
  active: 'نشيط',
};

const genderLabels: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
};

export const DietRequestsHistory = ({ phone }: DietRequestsHistoryProps) => {
  const [requests, setRequests] = useState<DietRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      
      const cleanPhone = toEnglishDigits(phone).replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('diet_requests')
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
        <Salad className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
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
                <Salad className="w-4 h-4 text-primary" />
                <span className="font-medium">طلب نظام غذائي</span>
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
                <span className="text-muted-foreground">الهدف:</span>
                <p className="font-medium">{goalLabels[request.goal] || request.goal}</p>
              </div>
              <div>
                <span className="text-muted-foreground">الوزن:</span>
                <p className="font-medium">{request.weight} كجم</p>
              </div>
              <div>
                <span className="text-muted-foreground">الطول:</span>
                <p className="font-medium">{request.height} سم</p>
              </div>
            </div>

            {request.admin_response && (
              <div className="mt-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-success">الرد:</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{request.admin_response}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
