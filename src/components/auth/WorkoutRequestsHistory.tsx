import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client.runtime';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dumbbell, Clock, CheckCircle, XCircle } from 'lucide-react';
import { normalizeEgyptPhoneDigits } from '@/lib/phone';

interface WorkoutRequest {
  id: string;
  weight: number;
  goal: string;
  training_level: string;
  training_location: string;
  training_days: number;
  session_duration: number;
  status: string;
  admin_response: string | null;
  created_at: string;
}

interface WorkoutRequestsHistoryProps {
  phone: string;
}

const goalLabels: Record<string, string> = {
  weight_loss: 'خسارة وزن',
  muscle_gain: 'بناء عضلات',
  strength: 'زيادة القوة',
  fitness: 'لياقة عامة',
  flexibility: 'مرونة',
};

const levelLabels: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};

const locationLabels: Record<string, string> = {
  gym: 'الجيم',
  home: 'المنزل',
  outdoor: 'في الخارج',
};

const statusConfig = {
  pending: { label: 'قيد المراجعة', icon: Clock, className: 'bg-warning/10 text-warning border-warning/30' },
  responded: { label: 'تم الرد', icon: CheckCircle, className: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'مرفوض', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export const WorkoutRequestsHistory = ({ phone }: WorkoutRequestsHistoryProps) => {
  const [requests, setRequests] = useState<WorkoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const normalizedPhone = normalizeEgyptPhoneDigits(phone);
      if (!normalizedPhone) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('workout_requests')
        .select('*')
        .or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
      setLoading(false);
    };

    fetchRequests();
  }, [phone]);

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4">
      {requests.map((req) => {
        const status = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.pending;
        const StatusIcon = status.icon;

        return (
          <Card key={req.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="font-medium">{goalLabels[req.goal] || req.goal}</span>
              </div>
              <Badge variant="outline" className={status.className}>
                <StatusIcon className="w-3 h-3 ml-1" />
                {status.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
              <span>الوزن: {req.weight} كجم</span>
              <span>المستوى: {levelLabels[req.training_level]}</span>
              <span>المكان: {locationLabels[req.training_location]}</span>
              <span>{req.training_days} أيام/أسبوع</span>
              <span>المدة: {req.session_duration} دقيقة</span>
            </div>

            <p className="text-xs text-muted-foreground">
              {format(parseISO(req.created_at), 'dd MMMM yyyy', { locale: ar })}
            </p>

            {req.admin_response && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1 text-primary">الرد:</p>
                <p className="text-sm whitespace-pre-wrap">{req.admin_response}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
