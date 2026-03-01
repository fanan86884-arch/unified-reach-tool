import { useState, useEffect, useRef } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionType } from '@/types/subscriber';
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
import { addDays, format } from 'date-fns';
import { useCloudSettings } from '@/hooks/useCloudSettings';
import { Loader2 } from 'lucide-react';

interface SubscriberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriberFormData) => void | Promise<void>;
  editingSubscriber?: Subscriber | null;
  captains: string[];
}

// مدة الاشتراك بالأيام (الشهر = 30 يوم)
const subscriptionDurations: Record<SubscriptionType, number> = {
  monthly: 30,
  quarterly: 90,
  'semi-annual': 180,
  annual: 365,
};

const subscriptionLabels: Record<SubscriptionType, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

const getInitialFormData = (editingSubscriber: Subscriber | null | undefined, defaultPrice: number, captain: string): SubscriberFormData => {
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
  const defaultCaptain = captains[0] || 'كابتن خالد';
  
  const [formData, setFormData] = useState<SubscriberFormData>(() => 
    getInitialFormData(editingSubscriber, 250, defaultCaptain)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isInitialized = useRef(false);

  // Initialize form only when dialog opens
  useEffect(() => {
    if (!isOpen) {
      isInitialized.current = false;
      setIsSubmitting(false);
      return;
    }

    if (isInitialized.current) return;
    isInitialized.current = true;

    const price = getPrice('monthly');
    const data = getInitialFormData(editingSubscriber, price, defaultCaptain);
    setFormData(data);
  }, [isOpen, editingSubscriber, defaultCaptain, getPrice]);

  const handleSubscriptionTypeChange = (type: SubscriptionType) => {
    const startDate = new Date(formData.startDate);
    const endDate = addDays(startDate, subscriptionDurations[type]);
    const newRemaining = calculateRemaining(type, formData.paidAmount);
    
    setFormData({
      ...formData,
      subscriptionType: type,
      endDate: format(endDate, 'yyyy-MM-dd'),
      remainingAmount: newRemaining,
    });
  };

  const handlePaidAmountChange = (value: number) => {
    const remaining = calculateRemaining(formData.subscriptionType, value);
    setFormData({
      ...formData,
      paidAmount: value,
      remainingAmount: remaining,
    });
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
            {editingSubscriber ? 'تعديل مشترك' : 'إضافة مشترك جديد'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="أدخل اسم المشترك"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الموبايل</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01xxxxxxxxx"
              required
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">رقم مصري بدون مفتاح الدولة</p>
          </div>

          <div className="space-y-2">
            <Label>نوع الاشتراك</Label>
            <Select
              value={formData.subscriptionType}
              onValueChange={(value) => handleSubscriptionTypeChange(value as SubscriptionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(subscriptionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label} - {getPrice(value as SubscriptionType)} جنيه
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>الكابتن</Label>
            <Select
              value={formData.captain}
              onValueChange={(value) => setFormData({ ...formData, captain: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="كابتن خالد">كابتن خالد</SelectItem>
                <SelectItem value="كابتن محمد">كابتن محمد</SelectItem>
                <SelectItem value="كابتن أحمد">كابتن أحمد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">تاريخ البداية</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  const storageDate = e.target.value;
                  if (storageDate) {
                    const startDate = new Date(storageDate);
                    const endDate = addDays(startDate, subscriptionDurations[formData.subscriptionType]);
                    setFormData({
                      ...formData,
                      startDate: storageDate,
                      endDate: format(endDate, 'yyyy-MM-dd'),
                    });
                  }
                }}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">تاريخ الانتهاء</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => {
                  const storageDate = e.target.value;
                  if (storageDate) {
                    setFormData({
                      ...formData,
                      endDate: storageDate,
                    });
                  }
                }}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paidAmount">المبلغ المدفوع</Label>
              <Input
                id="paidAmount"
                type="number"
                value={formData.paidAmount || ''}
                onChange={(e) => handlePaidAmountChange(Number(e.target.value) || 0)}
                min={0}
                dir="ltr"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remainingAmount">المبلغ المتبقي</Label>
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
                editingSubscriber ? 'حفظ التعديلات' : 'إضافة المشترك'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
