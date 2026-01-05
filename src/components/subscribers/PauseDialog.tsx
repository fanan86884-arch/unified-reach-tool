import { useState, useMemo } from 'react';
import { Subscriber } from '@/types/subscriber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { addDays, addWeeks, addMonths, format, differenceInDays, startOfDay, parseISO } from 'date-fns';

interface PauseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber | null;
  onPause: (id: string, pauseUntil: string) => void;
}

type PauseDuration = '1week' | '2weeks' | '1month' | 'custom';

export const PauseDialog = ({ isOpen, onClose, subscriber, onPause }: PauseDialogProps) => {
  const [pauseDuration, setPauseDuration] = useState<PauseDuration>('1week');
  const [customDate, setCustomDate] = useState(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'));

  if (!subscriber) return null;

  const calculatePauseUntil = (): string => {
    const today = new Date();
    switch (pauseDuration) {
      case '1week':
        return format(addWeeks(today, 1), 'yyyy-MM-dd');
      case '2weeks':
        return format(addWeeks(today, 2), 'yyyy-MM-dd');
      case '1month':
        return format(addMonths(today, 1), 'yyyy-MM-dd');
      case 'custom':
        return customDate;
      default:
        return format(addWeeks(today, 1), 'yyyy-MM-dd');
    }
  };

  // حساب تاريخ الانتهاء الجديد بعد الإيقاف
  const calculateNewEndDate = (): string => {
    const pauseUntil = calculatePauseUntil();
    const today = startOfDay(new Date());
    const pauseEndDate = startOfDay(parseISO(pauseUntil));
    const pauseDays = differenceInDays(pauseEndDate, today);
    
    const currentEndDate = new Date(subscriber.endDate);
    currentEndDate.setDate(currentEndDate.getDate() + pauseDays);
    return format(currentEndDate, 'dd/MM/yyyy');
  };

  // حساب عدد أيام الإيقاف
  const getPauseDays = (): number => {
    const pauseUntil = calculatePauseUntil();
    const today = startOfDay(new Date());
    const pauseEndDate = startOfDay(parseISO(pauseUntil));
    return differenceInDays(pauseEndDate, today);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPause(subscriber.id, calculatePauseUntil());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إيقاف اشتراك {subscriber.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>مدة الإيقاف</Label>
            <Select
              value={pauseDuration}
              onValueChange={(value) => setPauseDuration(value as PauseDuration)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1week">أسبوع</SelectItem>
                <SelectItem value="2weeks">أسبوعين</SelectItem>
                <SelectItem value="1month">شهر</SelectItem>
                <SelectItem value="custom">تحديد تاريخ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pauseDuration === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customDate">تاريخ انتهاء الإيقاف</Label>
              <Input
                id="customDate"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                dir="ltr"
              />
            </div>
          )}

          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">سيتم إيقاف الاشتراك حتى:</span>
              <span className="font-bold">{format(parseISO(calculatePauseUntil()), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">عدد أيام الإيقاف:</span>
              <span className="font-bold">{getPauseDays()} يوم</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-sm text-muted-foreground">تاريخ الانتهاء الجديد:</span>
              <span className="font-bold text-primary">{calculateNewEndDate()}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="warning" className="flex-1">
              تأكيد الإيقاف
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
