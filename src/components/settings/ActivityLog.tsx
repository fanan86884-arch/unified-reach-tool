import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  History, 
  RotateCcw, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Archive, 
  ArchiveRestore,
  RefreshCw,
  Pause,
  Play,
  Loader2
} from 'lucide-react';
import { useActivityLog, getActionLabel, ActivityLog as ActivityLogType } from '@/hooks/useActivityLog';
import { formatDistanceToNow, parseISO, isToday, isYesterday, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  add: UserPlus,
  update: Edit,
  delete: UserMinus,
  archive: Archive,
  restore: ArchiveRestore,
  renew: RefreshCw,
  pause: Pause,
  resume: Play,
  revert: RotateCcw,
};

const actionColors: Record<string, string> = {
  add: 'text-green-500',
  update: 'text-blue-500',
  delete: 'text-destructive',
  archive: 'text-muted-foreground',
  restore: 'text-primary',
  renew: 'text-green-500',
  pause: 'text-warning',
  resume: 'text-primary',
  revert: 'text-accent',
};

const getRelativeTime = (dateStr: string): string => {
  const date = parseISO(dateStr);
  
  if (isToday(date)) {
    return `اليوم ${format(date, 'HH:mm', { locale: ar })}`;
  }
  
  if (isYesterday(date)) {
    return `أمس ${format(date, 'HH:mm', { locale: ar })}`;
  }
  
  return formatDistanceToNow(date, { addSuffix: true, locale: ar });
};

export const ActivityLogComponent = () => {
  const { logs, loading, revertChange, clearLogs } = useActivityLog();
  const { toast } = useToast();

  const handleRevert = async (log: ActivityLogType) => {
    const success = await revertChange(log);
    if (success) {
      toast({ title: 'تم إرجاع التغيير بنجاح' });
    } else {
      toast({ title: 'فشل في إرجاع التغيير', variant: 'destructive' });
    }
  };

  const handleClearLogs = async () => {
    await clearLogs();
    toast({ title: 'تم مسح سجل التغييرات' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          سجل التغييرات
        </h4>
        {logs.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
                مسح السجل
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم مسح جميع سجلات التغييرات. لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearLogs}>مسح</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">لا توجد سجلات</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => {
            const Icon = actionIcons[log.actionType] || Edit;
            const colorClass = actionColors[log.actionType] || 'text-muted-foreground';
            const canRevert = log.previousData && log.subscriberId && log.actionType !== 'delete';

            return (
              <Card key={log.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {getActionLabel(log.actionType)}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {getRelativeTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {log.subscriberName}
                    </p>
                    {log.actionDetails && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.entries(log.actionDetails)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(' • ')}
                      </p>
                    )}
                  </div>
                  {canRevert && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevert(log)}
                      className="shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
