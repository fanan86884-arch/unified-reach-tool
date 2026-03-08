import { useState } from 'react';
import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, Trash2, Archive, RotateCcw, MessageCircle, RefreshCw, 
  ChevronDown, ChevronUp, Pause, Play, Clock, AlertCircle, ArchiveRestore
} from 'lucide-react';
import { differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

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
  const { t } = useLanguage();

  const today = startOfDay(new Date());
  const endDate = startOfDay(parseISO(subscriber.endDate));
  const daysDiff = differenceInCalendarDays(endDate, today);
  const daysRemaining = daysDiff + 1;

  const getDisplayStatus = () => {
    if (subscriber.isPaused) {
      return {
        label: t.status.paused,
        className: 'bg-muted text-muted-foreground',
        showDays: false,
        daysCount: 0,
        daysLabel: '',
        isExpiring: false,
        isExpired: false,
      };
    }

    if (daysDiff < 0) {
      const daysSinceExpiry = Math.abs(daysDiff);
      if (daysSinceExpiry >= 30) {
        const months = Math.floor(daysSinceExpiry / 30);
        return {
          label: t.status.expired,
          className: 'bg-destructive/15 text-destructive border-destructive/30',
          showDays: true,
          daysCount: months,
          daysLabel: months === 1 ? t.common.month : t.common.months,
          isExpiring: false,
          isExpired: true,
        };
      }
      return {
        label: t.status.expired,
        className: 'bg-destructive/15 text-destructive border-destructive/30',
        showDays: true,
        daysCount: daysSinceExpiry,
        daysLabel: t.common.day,
        isExpiring: false,
        isExpired: true,
      };
    }

    if (daysRemaining <= 3) {
      return {
        label: t.status.remaining,
        className: 'bg-warning/15 text-warning border-warning/30',
        showDays: true,
        daysCount: daysRemaining,
        daysLabel: t.common.day,
        isExpiring: true,
        isExpired: false,
      };
    }

    return {
      label: t.status.active,
      className: 'bg-success/15 text-success border-success/30',
      showDays: true,
      daysCount: daysRemaining,
      daysLabel: t.common.day,
      isExpiring: false,
      isExpired: false,
    };
  };

  const displayStatus = getDisplayStatus();
  const hasRemainingAmount = subscriber.remainingAmount > 0;

  const formatDateNumeric = (dateStr: string) => {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  };

  return (
    <Card className={cn(
      "card-shadow hover:card-shadow-hover transition-all duration-300 overflow-hidden active:scale-[0.98]",
      subscriber.isArchived && "border-dashed border-warning/50 bg-warning/5"
    )}>
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{subscriber.name}</h3>
            <div className="text-sm text-muted-foreground">
              <span>{formatDateNumeric(subscriber.endDate)}</span>
              <span className="mx-1">-</span>
              <span>{formatDateNumeric(subscriber.startDate)}</span>
              {subscriber.isPaused && subscriber.pausedUntil && (
                <span className="mr-2 text-warning">
                  ({t.actions.pausedUntil} {format(parseISO(subscriber.pausedUntil), 'dd/MM')})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mr-2">
            {hasRemainingAmount && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            {displayStatus.isExpiring && (
              <Clock className="w-4 h-4 text-warning" />
            )}
            {subscriber.isPaused && (
              <Pause className="w-4 h-4 text-muted-foreground" />
            )}
            {!subscriber.isArchived && (
              <Badge className={cn('border flex flex-col items-center leading-tight py-1 px-2', displayStatus.className)}>
                <span>{displayStatus.label}</span>
                {displayStatus.showDays && (
                  <span className="text-[10px]">{displayStatus.daysCount} {displayStatus.daysLabel}</span>
                )}
              </Badge>
            )}
          </div>
        </div>
        {subscriber.isArchived && (() => {
          const monthsSinceExpiry = Math.max(1, Math.floor(differenceInCalendarDays(today, endDate) / 30));
          const expiredMonths = daysDiff < 0 ? monthsSinceExpiry : 0;
          return (
            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-[10px] px-2 py-1 whitespace-nowrap flex flex-col items-center shrink-0 ml-2">
              <span className="flex items-center">
                <ArchiveRestore className="w-3 h-3 ml-1.5" />
                {t.status.archived}
              </span>
              {expiredMonths > 0 && (
                <span className="text-[9px] text-warning whitespace-nowrap">
                  {t.actions.sinceMonths} {expiredMonths} {expiredMonths === 1 ? t.common.month : expiredMonths <= 10 ? t.common.months : t.common.month}
                </span>
              )}
            </Badge>
          );
        })()}
        <Button variant="ghost" size="sm" className="mr-2">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">{t.subscribers.phone}:</span>
              <p className="font-medium">{subscriber.phone}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.subscribers.subscriptionType}:</span>
              <p className="font-medium">{t.subscriptionTypes[subscriber.subscriptionType]}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.subscribers.captain}:</span>
              <p className="font-medium">{subscriber.captain}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.subscribers.daysRemaining}:</span>
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
                 {subscriber.isPaused ? t.status.paused : daysDiff < 0 ? t.status.expired : `${daysRemaining} ${t.common.day}`}
               </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.subscribers.paidAmount}:</span>
              <p className="font-medium text-success">{subscriber.paidAmount} {t.common.currency}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.subscribers.remainingAmount}:</span>
              <p
                className={cn(
                  'font-medium',
                  subscriber.remainingAmount > 0 ? 'text-destructive' : 'text-success'
                )}
              >
                {subscriber.remainingAmount} {t.common.currency}
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
              <span>{t.actions.whatsapp}</span>
            </Button>
            {!isArchived && !subscriber.isArchived && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onEdit(subscriber)}
                >
                  <Edit className="w-5 h-5" />
                  <span>{t.common.edit}</span>
                </Button>
                <Button 
                  variant="success" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onRenew(subscriber)}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>{t.actions.renew}</span>
                </Button>
                {subscriber.isPaused ? (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-12 flex-col gap-1 text-xs"
                    onClick={() => onResume(subscriber.id)}
                  >
                    <Play className="w-5 h-5" />
                    <span>{t.actions.resume}</span>
                  </Button>
                ) : (
                  <Button 
                    variant="warning" 
                    size="sm" 
                    className="h-12 flex-col gap-1 text-xs"
                    onClick={() => onPause(subscriber)}
                  >
                    <Pause className="w-5 h-5" />
                    <span>{t.actions.pause}</span>
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onArchive(subscriber.id)}
                >
                  <Archive className="w-5 h-5" />
                  <span>{t.actions.archive}</span>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onDelete(subscriber.id)}
                >
                  <Trash2 className="w-5 h-5" />
                  <span>{t.common.delete}</span>
                </Button>
              </>
            )}
            {subscriber.isArchived && onRestore && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onRestore(subscriber.id)}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>{t.actions.restore}</span>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onDelete(subscriber.id)}
                >
                  <Trash2 className="w-5 h-5" />
                  <span>{t.common.delete}</span>
                </Button>
              </>
            )}
            {isArchived && !subscriber.isArchived && onRestore && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onRestore(subscriber.id)}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>{t.actions.restore}</span>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-12 flex-col gap-1 text-xs"
                  onClick={() => onDelete(subscriber.id)}
                >
                  <Trash2 className="w-5 h-5" />
                  <span>{t.common.delete}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
