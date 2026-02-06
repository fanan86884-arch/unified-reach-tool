import { useState } from 'react';
import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, Trash2, Archive, RotateCcw, MessageCircle, RefreshCw, 
  ChevronDown, ChevronUp, Pause, Play, Clock, AlertCircle
} from 'lucide-react';
import { differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface SubscriberCardCompactProps {
  subscriber: Subscriber;
  onEdit: (subscriber: Subscriber) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore?: (id: string) => void;
  onRenew: (subscriber: Subscriber) => void;
  onWhatsApp: (subscriber: Subscriber) => void;
  onPause: (subscriber: Subscriber) => void;
  onResume: (id: string) => void;
  isArchived?: boolean;
}

const subscriptionTypeLabels = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

export const SubscriberCardCompact = ({
  subscriber,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onRenew,
  onWhatsApp,
  onPause,
  onResume,
  isArchived = false,
}: SubscriberCardCompactProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // حساب الأيام المتبقية بشكل صحيح (حسب التقويم) مع احتساب اليوم الحالي
  const today = startOfDay(new Date());
  const endDate = startOfDay(parseISO(subscriber.endDate));
  const daysDiff = differenceInCalendarDays(endDate, today); // سالب = منتهي
  const daysRemaining = daysDiff + 1; // شامل اليوم الحالي
  // تحديد الحالة للعرض
  const getDisplayStatus = () => {
    // إذا كان الاشتراك موقوف
    if (subscriber.isPaused) {
      return {
        label: 'موقوف',
        className: 'bg-muted text-muted-foreground',
        showDays: false,
        daysCount: 0,
        daysLabel: '',
        isExpiring: false,
        isExpired: false,
      };
    }

    // إذا انتهى الاشتراك (تاريخ الانتهاء قبل اليوم)
    if (daysDiff < 0) {
      const daysSinceExpiry = Math.abs(daysDiff);
      // إذا مر شهر (30 يوم) أو أكثر، نعرض بالشهور
      if (daysSinceExpiry >= 30) {
        const months = Math.floor(daysSinceExpiry / 30);
        return {
          label: 'منتهي',
          className: 'bg-destructive/15 text-destructive border-destructive/30',
          showDays: true,
          daysCount: months,
          daysLabel: months === 1 ? 'شهر' : 'شهور',
          isExpiring: false,
          isExpired: true,
        };
      }
      return {
        label: 'منتهي',
        className: 'bg-destructive/15 text-destructive border-destructive/30',
        showDays: true,
        daysCount: daysSinceExpiry,
        daysLabel: 'يوم',
        isExpiring: false,
        isExpired: true,
      };
    }

    // قارب على الانتهاء (3 أيام أو أقل)
    if (daysRemaining <= 3) {
      return {
        label: 'متبقي',
        className: 'bg-warning/15 text-warning border-warning/30',
        showDays: true,
        daysCount: daysRemaining,
        daysLabel: 'يوم',
        isExpiring: true,
        isExpired: false,
      };
    }

    // نشط عادي
    return {
      label: 'نشط',
      className: 'bg-success/15 text-success border-success/30',
      showDays: true,
      daysCount: daysRemaining,
      daysLabel: 'يوم',
      isExpiring: false,
      isExpired: false,
    };
  };

  const displayStatus = getDisplayStatus();
  
  // هل عليه فلوس متبقية؟
  const hasRemainingAmount = subscriber.remainingAmount > 0;

  // تنسيق التاريخ كأرقام فقط
  const formatDateNumeric = (dateStr: string) => {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  };

  return (
    <Card className="card-shadow hover:card-shadow-hover transition-all duration-300 animate-fade-in overflow-hidden">
      {/* Compact Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{subscriber.name}</h3>
            <div className="text-sm text-muted-foreground">
              <span>{formatDateNumeric(subscriber.endDate)}</span>
              <span className="mx-1">-</span>
              <span>{formatDateNumeric(subscriber.startDate)}</span>
              {subscriber.isPaused && subscriber.pausedUntil && (
                <span className="mr-2 text-warning">
                  (موقوف حتى {format(parseISO(subscriber.pausedUntil), 'dd/MM')})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* رمز التعجب لو عليه فلوس - باللون الأحمر */}
            {hasRemainingAmount && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            {/* رمز العقرب (الساعة) لو قارب على الانتهاء */}
            {displayStatus.isExpiring && (
              <Clock className="w-4 h-4 text-warning" />
            )}
            {/* رمز الإيقاف */}
            {subscriber.isPaused && (
              <Pause className="w-4 h-4 text-muted-foreground" />
            )}
            <Badge className={cn('border', displayStatus.className)}>
              {displayStatus.label}
              {displayStatus.showDays && (
                <span className="mr-1">({displayStatus.daysCount} {displayStatus.daysLabel})</span>
              )}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mr-2">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">الهاتف:</span>
              <p className="font-medium">{subscriber.phone}</p>
            </div>
            <div>
              <span className="text-muted-foreground">نوع الاشتراك:</span>
              <p className="font-medium">{subscriptionTypeLabels[subscriber.subscriptionType]}</p>
            </div>
            <div>
              <span className="text-muted-foreground">الكابتن:</span>
              <p className="font-medium">{subscriber.captain}</p>
            </div>
            <div>
              <span className="text-muted-foreground">الأيام المتبقية:</span>
               <p
                 className={cn(
                   'font-bold',
                   subscriber.isPaused
                     ? 'text-muted-foreground'
                     : daysDiff < 0
                     ? 'text-destructive'
                     : daysRemaining <= 7
                     ? 'text-warning'
                     : 'text-success'
                 )}
               >
                 {subscriber.isPaused ? 'موقوف' : daysDiff < 0 ? 'منتهي' : `${daysRemaining} يوم`}
               </p>
            </div>
            <div>
              <span className="text-muted-foreground">المدفوع:</span>
              <p className="font-medium text-success">{subscriber.paidAmount} جنيه</p>
            </div>
            <div>
              <span className="text-muted-foreground">المتبقي:</span>
              <p
                className={cn(
                  'font-medium',
                  subscriber.remainingAmount > 0 ? 'text-destructive' : 'text-success'
                )}
              >
                {subscriber.remainingAmount} جنيه
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="whatsapp" 
              size="sm" 
              className="h-12 flex-col gap-1 text-xs"
              onClick={() => onWhatsApp(subscriber)}
            >
              <MessageCircle className="w-5 h-5" />
              <span>واتساب</span>
            </Button>
            {!isArchived && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onEdit(subscriber)}
                >
                  <Edit className="w-5 h-5" />
                  <span>تعديل</span>
                </Button>
                <Button 
                  variant="success" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onRenew(subscriber)}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>تجديد</span>
                </Button>
                {subscriber.isPaused ? (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-12 flex-col gap-1 text-xs"
                    onClick={() => onResume(subscriber.id)}
                  >
                    <Play className="w-5 h-5" />
                    <span>استئناف</span>
                  </Button>
                ) : (
                  <Button 
                    variant="warning" 
                    size="sm" 
                    className="h-12 flex-col gap-1 text-xs"
                    onClick={() => onPause(subscriber)}
                  >
                    <Pause className="w-5 h-5" />
                    <span>إيقاف</span>
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onArchive(subscriber.id)}
                >
                  <Archive className="w-5 h-5" />
                  <span>أرشفة</span>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onDelete(subscriber.id)}
                >
                  <Trash2 className="w-5 h-5" />
                  <span>حذف</span>
                </Button>
              </>
            )}
            {isArchived && onRestore && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onRestore(subscriber.id)}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>استعادة</span>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onDelete(subscriber.id)}
                >
                  <Trash2 className="w-5 h-5" />
                  <span>حذف</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
