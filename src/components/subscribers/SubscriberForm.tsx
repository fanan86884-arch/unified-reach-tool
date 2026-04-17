import { useState, useEffect, useRef } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionType, Gender, SubscriptionCategory } from '@/types/subscriber';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format, parse } from 'date-fns';
import { useCloudSettings } from '@/hooks/useCloudSettings';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

interface SubscriberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriberFormData) => void | Promise<void>;
  editingSubscriber?: Subscriber | null;
  captains: string[];
}

const subscriptionDurations: Record<SubscriptionType, number> = {
  monthly: 30,
  quarterly: 90,
  'semi-annual': 180,
  annual: 365,
};

const GENDER_LABEL: Record<Gender, string> = { male: 'ولد', female: 'بنت' };
const CATEGORY_LABEL: Record<SubscriptionCategory, string> = {
  gym: 'جيم فقط',
  gym_walking: 'جيم + مشاية',
  walking: 'مشاية فقط',
};

const getInitialFormData = (
  editingSubscriber: Subscriber | null | undefined,
  defaultPrice: number,
  captain: string
): SubscriberFormData => {
  if (editingSubscriber) {
    return {
      name: editingSubscriber.name,
      phone: editingSubscriber.phone,
      subscriptionType: editingSubscriber.subscriptionType,
      startDate: editingSubscriber.startDate,
      endDate: editingSubscriber.endDate,
      paidAmount: editingSubscriber.paidAmount,
      remainingAmount: editingSubscriber.remainingAmount,
      captain: editingSubscriber.captain,
      gender: editingSubscriber.gender || 'male',
      subscriptionCategory: editingSubscriber.subscriptionCategory || 'gym',
    };
  }

  const today = new Date();
  const endDate = addDays(today, 30);
  return {
    name: '',
    phone: '',
    subscriptionType: 'monthly',
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    paidAmount: 0,
    remainingAmount: defaultPrice,
    captain: captain,
    gender: 'male',
    subscriptionCategory: 'gym',
  };
};

export const SubscriberForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingSubscriber,
  captains,
}: SubscriberFormProps) => {
  const { getPrice, calculateRemaining, loading: settingsLoading } = useCloudSettings();
  const { t } = useLanguage();
  const defaultCaptain = captains[0] || 'كابتن خالد';

  const [formData, setFormData] = useState<SubscriberFormData>(() =>
    getInitialFormData(editingSubscriber, 250, defaultCaptain)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      isInitialized.current = false;
      setIsSubmitting(false);
      return;
    }

    if (isInitialized.current) return;
    isInitialized.current = true;

    const initial = getInitialFormData(editingSubscriber, 0, defaultCaptain);
    const price = getPrice(initial.subscriptionType, initial.gender, initial.subscriptionCategory);
    if (!editingSubscriber) {
      initial.remainingAmount = price;
    }
    setFormData(initial);
  }, [isOpen, editingSubscriber, defaultCaptain, getPrice]);

  const recalc = (updates: Partial<SubscriberFormData>) => {
    const next: SubscriberFormData = { ...formData, ...updates };
    if ('subscriptionType' in updates) {
      const startDate = new Date(next.startDate);
      next.endDate = format(addDays(startDate, subscriptionDurations[next.subscriptionType]), 'yyyy-MM-dd');
    }
    next.remainingAmount = calculateRemaining(
      next.subscriptionType,
      next.paidAmount,
      next.gender,
      next.subscriptionCategory
    );
    setFormData(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (settingsLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <div className="overflow-y-auto flex-1 -mx-6 px-6 scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch' }}>
        <DialogHeader>
          <DialogTitle>
            {editingSubscriber ? t.subscribers.editSubscriber : t.subscribers.addNew}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.form.name}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t.form.namePlaceholder}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t.form.phone}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t.form.phonePlaceholder}
              required
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">{t.form.phoneHint}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>نوع المشترك</Label>
              <Select
                value={formData.gender}
                onValueChange={(v) => recalc({ gender: v as Gender })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['male', 'female'] as Gender[]).map((g) => (
                    <SelectItem key={g} value={g}>{GENDER_LABEL[g]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>فئة الاشتراك</Label>
              <Select
                value={formData.subscriptionCategory}
                onValueChange={(v) => recalc({ subscriptionCategory: v as SubscriptionCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['gym', 'gym_walking', 'walking'] as SubscriptionCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.form.subscriptionType}</Label>
            <Select
              value={formData.subscriptionType}
              onValueChange={(value) => recalc({ subscriptionType: value as SubscriptionType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(subscriptionDurations) as SubscriptionType[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t.subscriptionTypes[value]} - {getPrice(value, formData.gender, formData.subscriptionCategory)} {t.common.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.form.captain}</Label>
            <Select
              value={formData.captain}
              onValueChange={(value) => setFormData({ ...formData, captain: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {captains.map((captain) => (
                  <SelectItem key={captain} value={captain}>{captain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.form.startDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}
                    dir="ltr"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(parse(formData.startDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : t.form.selectDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate ? parse(formData.startDate, 'yyyy-MM-dd', new Date()) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const endDate = addDays(date, subscriptionDurations[formData.subscriptionType]);
                        setFormData({
                          ...formData,
                          startDate: format(date, 'yyyy-MM-dd'),
                          endDate: format(endDate, 'yyyy-MM-dd'),
                        });
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t.form.endDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}
                    dir="ltr"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(parse(formData.endDate, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : t.form.selectDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate ? parse(formData.endDate, 'yyyy-MM-dd', new Date()) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFormData({
                          ...formData,
                          endDate: format(date, 'yyyy-MM-dd'),
                        });
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paidAmount">{t.form.paidAmount}</Label>
              <Input
                id="paidAmount"
                type="number"
                value={formData.paidAmount || ''}
                onChange={(e) => recalc({ paidAmount: Number(e.target.value) || 0 })}
                min={0}
                dir="ltr"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remainingAmount">{t.form.remainingAmount}</Label>
              <Input
                id="remainingAmount"
                type="number"
                value={formData.remainingAmount}
                readOnly
                className="bg-muted"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                editingSubscriber ? t.subscribers.saveChanges : t.subscribers.addSubscriber
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
