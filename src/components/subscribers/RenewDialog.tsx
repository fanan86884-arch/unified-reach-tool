import { useState, useEffect } from 'react';
import { Subscriber, SubscriptionType } from '@/types/subscriber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, subDays, format, parse, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface RenewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber | null;
  onRenew: (id: string, newEndDate: string, paidAmount: number) => void;
}

const subscriptionDurations: Record<SubscriptionType, number> = {
  monthly: 30, quarterly: 90, 'semi-annual': 180, annual: 365,
};

export const RenewDialog = ({ isOpen, onClose, subscriber, onRenew }: RenewDialogProps) => {
  const [renewalType, setRenewalType] = useState<SubscriptionType>('monthly');
  const [paidAmount, setPaidAmount] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (subscriber && isOpen) {
      const currentEndDate = parseISO(subscriber.endDate);
      const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
      const duration = subscriptionDurations[renewalType];
      const newEndDate = addDays(baseDate, duration);
      const newStartDate = subDays(newEndDate, 1);
      setEndDate(format(newEndDate, 'yyyy-MM-dd'));
      setStartDate(format(newStartDate, 'yyyy-MM-dd'));
    }
  }, [subscriber, renewalType, isOpen]);

  if (!subscriber) return null;

  const handleEndDateChange = (date: Date) => {
    setEndDate(format(date, 'yyyy-MM-dd'));
    setStartDate(format(subDays(date, 1), 'yyyy-MM-dd'));
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
          <DialogTitle>{t.renew.title} {subscriber.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.renew.renewalType}</Label>
            <Select value={renewalType} onValueChange={(v) => setRenewalType(v as SubscriptionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(t.subscriptionTypes) as SubscriptionType[]).map(type => (
                  <SelectItem key={type} value={type}>{t.subscriptionTypes[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.renew.newEndDate}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} dir="ltr">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(parse(endDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : t.form.selectDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => { if (date) handleEndDateChange(date); }} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t.renew.newStartDate}</Label>
            <Button variant="outline" className="w-full justify-start text-left font-normal bg-muted cursor-not-allowed" dir="ltr" type="button" disabled>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(parse(startDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : '-'}
            </Button>
            <p className="text-xs text-muted-foreground">{t.renew.autoCalculated}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">{t.form.paidAmount}</Label>
            <Input id="paidAmount" type="number" value={paidAmount || ''} onChange={(e) => setPaidAmount(Number(e.target.value))} min={0} dir="ltr" placeholder="0" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">{t.renew.confirmRenewal}</Button>
            <Button type="button" variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
