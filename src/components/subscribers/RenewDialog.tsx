import { useState, useEffect } from 'react';
import { Subscriber, SubscriptionType } from '@/types/subscriber';
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
import { addDays, subDays, format, parseISO } from 'date-fns';

interface RenewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber | null;
  onRenew: (id: string, newEndDate: string, paidAmount: number) => void;
}

// مدة الاشتراك بالأيام (الشهر = 30 يوم)
const subscriptionDurations: Record<SubscriptionType, number> = {
  monthly: 30,
  quarterly: 90,
  'semi-annual': 180,
  annual: 365,
};

export const RenewDialog = ({ isOpen, onClose, subscriber, onRenew }: RenewDialogProps) => {
  const [renewalType, setRenewalType] = useState<SubscriptionType>('monthly');
  const [paidAmount, setPaidAmount] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [startDate, setStartDate] = useState('');

  // Calculate initial dates when dialog opens or renewal type changes
  useEffect(() => {
    if (subscriber && isOpen) {
      const currentEndDate = parseISO(subscriber.endDate);
      const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
      const duration = subscriptionDurations[renewalType];
      const newEndDate = addDays(baseDate, duration);
      const newStartDate = subDays(newEndDate, duration);
      setEndDate(format(newEndDate, 'yyyy-MM-dd'));
      setStartDate(format(newStartDate, 'yyyy-MM-dd'));
    }
  }, [subscriber, renewalType, isOpen]);

  if (!subscriber) return null;

  const handleRenewalTypeChange = (value: SubscriptionType) => {
    setRenewalType(value);
  };

  // When user manually changes end date, auto-calculate start date
  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    try {
      const newEnd = parseISO(value);
      const duration = subscriptionDurations[renewalType];
      const newStart = subDays(newEnd, duration);
      setStartDate(format(newStart, 'yyyy-MM-dd'));
    } catch {
      // Invalid date, ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRenew(subscriber.id, endDate, paidAmount);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تجديد اشتراك {subscriber.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نوع التجديد</Label>
            <Select
              value={renewalType}
              onValueChange={handleRenewalTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">شهري</SelectItem>
                <SelectItem value="quarterly">ربع سنوي</SelectItem>
                <SelectItem value="semi-annual">نصف سنوي</SelectItem>
                <SelectItem value="annual">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">تاريخ بداية الاشتراك</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              readOnly
              dir="ltr"
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">يتم حسابه تلقائياً من تاريخ الانتهاء</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">تاريخ الانتهاء الجديد</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">المبلغ المدفوع</Label>
            <Input
              id="paidAmount"
              type="number"
              value={paidAmount || ''}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              min={0}
              dir="ltr"
              placeholder="0"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              تأكيد التجديد
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