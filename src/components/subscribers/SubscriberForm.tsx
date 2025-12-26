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
import { addMonths, addDays, format } from 'date-fns';

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

export const SubscriberForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingSubscriber,
  captains,
}: SubscriberFormProps) => {
  const [formData, setFormData] = useState<SubscriberFormData>({
    name: '',
    phone: '',
    subscriptionType: 'monthly',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    paidAmount: 0,
    remainingAmount: 0,
    captain: captains[0] || 'كابتن خالد',
  });

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
    } else {
      setFormData({
        name: '',
        phone: '',
        subscriptionType: 'monthly',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        paidAmount: 0,
        remainingAmount: 0,
        captain: captains[0] || 'كابتن خالد',
      });
    }
  }, [editingSubscriber, isOpen, captains]);

  const handleSubscriptionTypeChange = (type: SubscriptionType) => {
    const startDate = new Date(formData.startDate);
    const endDate = addMonths(startDate, subscriptionDurations[type]);
    setFormData({
      ...formData,
      subscriptionType: type,
      endDate: format(endDate, 'yyyy-MM-dd'),
    });
  };

  const handleStartDateChange = (date: string) => {
    const startDate = new Date(date);
    const endDate = addMonths(startDate, subscriptionDurations[formData.subscriptionType]);
    setFormData({
      ...formData,
      startDate: date,
      endDate: format(endDate, 'yyyy-MM-dd'),
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
                <SelectItem value="monthly">شهري</SelectItem>
                <SelectItem value="quarterly">ربع سنوي</SelectItem>
                <SelectItem value="semi-annual">نصف سنوي</SelectItem>
                <SelectItem value="annual">سنوي</SelectItem>
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
                onChange={(e) => handleStartDateChange(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">تاريخ الانتهاء</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
                onChange={(e) =>
                  setFormData({ ...formData, paidAmount: Number(e.target.value) })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, remainingAmount: Number(e.target.value) })
                }
                min={0}
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
