import { useState, useEffect } from 'react';
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
import { addMonths, format, parse } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';

interface SubscriberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriberFormData) => void;
  editingSubscriber?: Subscriber | null;
  captains: string[];
}

const subscriptionDurations: Record<SubscriptionType, number> = {
  monthly: 1,
  quarterly: 3,
  'semi-annual': 6,
  annual: 12,
};

const subscriptionLabels: Record<SubscriptionType, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

// تحويل من yyyy-MM-dd إلى dd/MM/yyyy للعرض
const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
};

// تحويل من dd/MM/yyyy إلى yyyy-MM-dd للتخزين
const formatDateForStorage = (displayDate: string): string => {
  if (!displayDate) return '';
  try {
    const parsed = parse(displayDate, 'dd/MM/yyyy', new Date());
    return format(parsed, 'yyyy-MM-dd');
  } catch {
    return displayDate;
  }
};

export const SubscriberForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingSubscriber,
  captains,
}: SubscriberFormProps) => {
  const { getPrice, calculateRemaining } = useSettings();
  
  const [formData, setFormData] = useState<SubscriberFormData>({
    name: '',
    phone: '',
    subscriptionType: 'monthly',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    paidAmount: 0,
    remainingAmount: getPrice('monthly'),
    captain: captains[0] || 'كابتن خالد',
  });

  const [displayStartDate, setDisplayStartDate] = useState(formatDateForDisplay(formData.startDate));
  const [displayEndDate, setDisplayEndDate] = useState(formatDateForDisplay(formData.endDate));

  useEffect(() => {
    if (editingSubscriber) {
      setFormData({
        name: editingSubscriber.name,
        phone: editingSubscriber.phone,
        subscriptionType: editingSubscriber.subscriptionType,
        startDate: editingSubscriber.startDate,
        endDate: editingSubscriber.endDate,
        paidAmount: editingSubscriber.paidAmount,
        remainingAmount: editingSubscriber.remainingAmount,
        captain: editingSubscriber.captain,
      });
      setDisplayStartDate(formatDateForDisplay(editingSubscriber.startDate));
      setDisplayEndDate(formatDateForDisplay(editingSubscriber.endDate));
    } else {
      const today = new Date();
      const endDate = addMonths(today, 1);
      const price = getPrice('monthly');
      setFormData({
        name: '',
        phone: '',
        subscriptionType: 'monthly',
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        paidAmount: 0,
        remainingAmount: price,
        captain: captains[0] || 'كابتن خالد',
      });
      setDisplayStartDate(format(today, 'dd/MM/yyyy'));
      setDisplayEndDate(format(endDate, 'dd/MM/yyyy'));
    }
  }, [editingSubscriber, isOpen, captains, getPrice]);

  const handleSubscriptionTypeChange = (type: SubscriptionType) => {
    const startDate = new Date(formData.startDate);
    const endDate = addMonths(startDate, subscriptionDurations[type]);
    const newRemaining = calculateRemaining(type, formData.paidAmount);
    
    setFormData({
      ...formData,
      subscriptionType: type,
      endDate: format(endDate, 'yyyy-MM-dd'),
      remainingAmount: newRemaining,
    });
    setDisplayEndDate(format(endDate, 'dd/MM/yyyy'));
  };

  const handleStartDateChange = (displayValue: string) => {
    setDisplayStartDate(displayValue);
    
    // محاولة تحويل التاريخ إذا كان بالتنسيق الصحيح
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(displayValue)) {
      try {
        const storageDate = formatDateForStorage(displayValue);
        const startDate = new Date(storageDate);
        const endDate = addMonths(startDate, subscriptionDurations[formData.subscriptionType]);
        
        setFormData({
          ...formData,
          startDate: storageDate,
          endDate: format(endDate, 'yyyy-MM-dd'),
        });
        setDisplayEndDate(format(endDate, 'dd/MM/yyyy'));
      } catch (e) {
        // تجاهل الأخطاء أثناء الكتابة
      }
    }
  };

  const handleEndDateChange = (displayValue: string) => {
    setDisplayEndDate(displayValue);
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(displayValue)) {
      try {
        const storageDate = formatDateForStorage(displayValue);
        setFormData({
          ...formData,
          endDate: storageDate,
        });
      } catch (e) {
        // تجاهل الأخطاء أثناء الكتابة
      }
    }
  };

  const handlePaidAmountChange = (value: number) => {
    const remaining = calculateRemaining(formData.subscriptionType, value);
    setFormData({
      ...formData,
      paidAmount: value,
      remainingAmount: remaining,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                value={displayStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                placeholder="يوم/شهر/سنة"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">تاريخ الانتهاء</Label>
              <Input
                id="endDate"
                value={displayEndDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                placeholder="يوم/شهر/سنة"
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
                value={formData.paidAmount}
                onChange={(e) => handlePaidAmountChange(Number(e.target.value))}
                min={0}
                dir="ltr"
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
            <Button type="submit" className="flex-1">
              {editingSubscriber ? 'حفظ التعديلات' : 'إضافة المشترك'}
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
