import { useState } from 'react';
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
import { addMonths, format, parseISO } from 'date-fns';

interface RenewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber | null;
  onRenew: (id: string, newEndDate: string, paidAmount: number) => void;
}

const subscriptionDurations: Record<SubscriptionType, number> = {
  monthly: 1,
  quarterly: 3,
  'semi-annual': 6,
  annual: 12,
};

export const RenewDialog = ({ isOpen, onClose, subscriber, onRenew }: RenewDialogProps) => {
  const [renewalType, setRenewalType] = useState<SubscriptionType>('monthly');
  const [paidAmount, setPaidAmount] = useState(0);

  if (!subscriber) return null;

  const currentEndDate = parseISO(subscriber.endDate);
  const newEndDate = addMonths(
    currentEndDate > new Date() ? currentEndDate : new Date(),
    subscriptionDurations[renewalType]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRenew(subscriber.id, format(newEndDate, 'yyyy-MM-dd'), paidAmount);
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
              onValueChange={(value) => setRenewalType(value as SubscriptionType)}
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

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">تاريخ الانتهاء الجديد:</p>
            <p className="font-bold text-lg">{format(newEndDate, 'yyyy-MM-dd')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">المبلغ المدفوع</Label>
            <Input
              id="paidAmount"
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              min={0}
              dir="ltr"
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
