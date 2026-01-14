import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useContactSettings } from '@/hooks/useContactSettings';
import { buildWhatsAppLink, normalizeEgyptPhoneDigits, toEnglishDigits } from '@/lib/phone';
import { sendPushNotificationToStaff } from '@/utils/sendPushNotification';
import { 
  Loader2, 
  User, 
  Phone, 
  Calendar, 
  CreditCard,
  CheckCircle,
  Copy,
} from 'lucide-react';
import { format, addDays, differenceInHours, parseISO } from 'date-fns';
import { Subscriber } from '@/types/subscriber';

interface MemberSubscriptionRequestProps {
  existingSubscriber: Subscriber | null;
  onClose: () => void;
}

const subscriptionDurations: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  'semi-annual': 180,
  annual: 365,
};

const subscriptionLabels: Record<string, string> = {
  monthly: 'شهري (30 يوم)',
  quarterly: 'ربع سنوي (90 يوم)',
  'semi-annual': 'نصف سنوي (180 يوم)',
  annual: 'سنوي (365 يوم)',
};


export const MemberSubscriptionRequest = ({ 
  existingSubscriber, 
  onClose 
}: MemberSubscriptionRequestProps) => {
  const { toast } = useToast();
  const { contactInfo, getWhatsAppLink } = useContactSettings();
  
  const [step, setStep] = useState<'form' | 'payment' | 'confirmation'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prices, setPrices] = useState({
    monthly: 250,
    quarterly: 500,
    'semi-annual': 900,
    annual: 1500,
  });
  const [paymentSettings, setPaymentSettings] = useState({
    instapayNumber: '',
    vodafoneCashNumber: '',
  });
  
  const [formData, setFormData] = useState({
    name: existingSubscriber?.name || '',
    phone: existingSubscriber?.phone || '',
    subscriptionType: 'monthly',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    paidAmount: 0,
    paymentMethod: '',
  });

  // Fetch prices from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (data) {
          setPrices({
            monthly: data.monthly_price,
            quarterly: data.quarterly_price,
            'semi-annual': data.semi_annual_price,
            annual: data.annual_price,
          });
        }
      } catch (e) {
        console.error('Error fetching prices:', e);
      }
    };

    const fetchPaymentSettings = async () => {
      try {
        const { data } = await supabase
          .from('contact_settings')
          .select('instapay_number, vodafone_cash_number')
          .limit(1)
          .maybeSingle();

        if (data) {
          setPaymentSettings({
            instapayNumber: data.instapay_number || '',
            vodafoneCashNumber: data.vodafone_cash_number || '',
          });
        }
      } catch (e) {
        console.error('Error fetching payment settings:', e);
      }
    };

    fetchSettings();
    fetchPaymentSettings();
  }, []);

  // Update end date when subscription type or start date changes
  useEffect(() => {
    const days = subscriptionDurations[formData.subscriptionType] || 30;
    const startDate = new Date(formData.startDate);
    const endDate = addDays(startDate, days);
    setFormData(prev => ({
      ...prev,
      endDate: format(endDate, 'yyyy-MM-dd'),
    }));
  }, [formData.subscriptionType, formData.startDate]);

  const currentPrice = prices[formData.subscriptionType as keyof typeof prices] || 0;
  const remainingAmount = Math.max(0, currentPrice - formData.paidAmount);

  const handleSubmit = async () => {
    // Validate form
    if (!existingSubscriber && (!formData.name.trim() || !formData.phone.trim())) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    const phoneToCheck = existingSubscriber?.phone || formData.phone.trim();
    const normalizedPhone = normalizeEgyptPhoneDigits(phoneToCheck);
    
    if (!normalizedPhone) {
      toast({
        title: 'خطأ',
        description: 'رقم الهاتف غير صحيح',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate request within 24 hours
    try {
      const { data: recentRequests } = await supabase
        .from('subscription_requests')
        .select('created_at')
        .or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentRequests && recentRequests.length > 0) {
        const lastRequest = parseISO(recentRequests[0].created_at);
        const hoursSince = differenceInHours(new Date(), lastRequest);
        if (hoursSince < 24) {
          toast({
            title: 'طلب موجود',
            description: 'لديك طلب قيد الانتظار بالفعل. يرجى الانتظار 24 ساعة قبل إرسال طلب جديد.',
            variant: 'destructive',
          });
          return;
        }
      }
    } catch (e) {
      console.error('Error checking recent requests:', e);
    }

    // Check for duplicate phone (only for new subscribers)
    if (!existingSubscriber) {
      try {
        const { data } = await supabase.functions.invoke('member-lookup', {
          body: { phone: normalizedPhone }
        });

        if (data?.found) {
          toast({
            title: 'خطأ',
            description: 'الرقم مسجل بالفعل',
            variant: 'destructive',
          });
          return;
        }
      } catch (e) {
        console.error('Error checking phone:', e);
      }
    }

    setStep('payment');
  };

  const handlePaymentMethodSelect = (method: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
    setStep('confirmation');
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      const requestName = (existingSubscriber?.name || formData.name).trim();
      const requestPhone = normalizeEgyptPhoneDigits(existingSubscriber?.phone || formData.phone);

      if (!requestName || !requestPhone) {
        toast({
          title: 'خطأ',
          description: 'يرجى التأكد من الاسم ورقم الهاتف',
          variant: 'destructive',
        });
        return;
      }

      // Insert subscription request
      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          name: requestName,
          phone: requestPhone,
          subscription_type: formData.subscriptionType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          paid_amount: formData.paidAmount,
          remaining_amount: remainingAmount,
          payment_method: formData.paymentMethod,
          status: 'pending',
        });

      if (error) throw error;

      // Send push notification to staff
      await sendPushNotificationToStaff({
        title: existingSubscriber ? 'طلب تجديد اشتراك' : 'طلب اشتراك جديد',
        body: `${requestName} - ${subscriptionLabels[formData.subscriptionType]} - ${formData.paidAmount} جنيه`,
        type: 'subscription',
        data: { url: '/' }
      });

      // Open WhatsApp to Captain Mohamed
      const captain = contactInfo.captains.find(c => c.name.includes('محمد'));
      const captainPhone = captain?.phone || contactInfo.captains[0]?.phone || '';
      const waLink = buildWhatsAppLink(captainPhone);

      const message = encodeURIComponent(
        `مرحباً، لقد قمت بالتحويل لطلب ${existingSubscriber ? 'تجديد' : 'اشتراك'} جديد.\n` +
        `الاسم: ${requestName}\n` +
        `الهاتف: ${requestPhone}\n` +
        `نوع الاشتراك: ${subscriptionLabels[formData.subscriptionType]}\n` +
        `المبلغ المدفوع: ${formData.paidAmount} جنيه\n` +
        `طريقة الدفع: ${formData.paymentMethod}\n\n` +
        `سأقوم بإرسال صورة التحويل الآن.`
      );

      if (waLink) {
        window.open(`${waLink}?text=${message}`, '_blank', 'noopener,noreferrer');
      }

      toast({
        title: 'تم إرسال الطلب بنجاح',
        description: 'سيتم مراجعة طلبك وتأكيده قريباً',
      });

      onClose();
    } catch (e) {
      console.error('Error submitting request:', e);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال الطلب',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ' });
  };

  if (step === 'payment') {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-center mb-4">اختر طريقة الدفع</h3>
        
        <div className="p-4 bg-muted rounded-lg mb-4 text-center">
          <p className="text-sm text-muted-foreground">المبلغ المطلوب</p>
          <p className="text-2xl font-bold text-primary">{formData.paidAmount} جنيه</p>
        </div>

        <div className="space-y-3">
          {paymentSettings.instapayNumber && (
            <Card 
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handlePaymentMethodSelect('Instapay')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">Instapay</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {paymentSettings.instapayNumber}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(paymentSettings.instapayNumber);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {paymentSettings.vodafoneCashNumber && (
            <Card 
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handlePaymentMethodSelect('Vodafone Cash')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">Vodafone Cash</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {paymentSettings.vodafoneCashNumber}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(paymentSettings.vodafoneCashNumber);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}
        </div>

        <Button variant="outline" onClick={() => setStep('form')} className="w-full mt-4">
          رجوع
        </Button>
      </div>
    );
  }

  if (step === 'confirmation') {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="font-bold text-lg">تأكيد الطلب</h3>
        <p className="text-muted-foreground">
          بعد التأكيد سيتم فتح واتساب لإرسال صورة التحويل
        </p>

        <div className="p-4 bg-muted rounded-lg text-right space-y-2">
          <p><span className="text-muted-foreground">الاسم:</span> {existingSubscriber?.name || formData.name}</p>
          <p><span className="text-muted-foreground">نوع الاشتراك:</span> {subscriptionLabels[formData.subscriptionType]}</p>
          <p><span className="text-muted-foreground">المبلغ المدفوع:</span> {formData.paidAmount} جنيه</p>
          <p><span className="text-muted-foreground">طريقة الدفع:</span> {formData.paymentMethod}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('payment')} className="flex-1">
            رجوع
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد وإرسال'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-center mb-4">
        {existingSubscriber ? 'تجديد الاشتراك' : 'طلب اشتراك جديد'}
      </h3>

      {/* Name - only for new subscribers */}
      {!existingSubscriber && (
        <div className="space-y-2">
          <Label>الاسم</Label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="أدخل اسمك"
              className="pr-10"
            />
          </div>
        </div>
      )}

      {/* Phone - only for new subscribers */}
      {!existingSubscriber && (
        <div className="space-y-2">
          <Label>رقم الهاتف</Label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="أدخل رقم الهاتف"
              className="pr-10"
              dir="ltr"
            />
          </div>
        </div>
      )}

      {/* Start Date */}
      <div className="space-y-2">
        <Label>تاريخ الاشتراك</Label>
        <div className="relative">
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            className="pr-10"
            dir="ltr"
          />
        </div>
      </div>

      {/* Subscription Type */}
      <div className="space-y-2">
        <Label>نوع الاشتراك</Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(subscriptionLabels).map(([type, label]) => (
            <Button
              key={type}
              type="button"
              variant={formData.subscriptionType === type ? 'default' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, subscriptionType: type }))}
              className="h-auto py-3 flex flex-col"
            >
              <span className="text-sm">{label.split(' ')[0]}</span>
              <span className="text-xs text-muted-foreground">
                {prices[type as keyof typeof prices]} جنيه
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Price Display */}
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">المبلغ المطلوب</span>
          <span className="font-bold text-lg">{currentPrice} جنيه</span>
        </div>
      </div>

      {/* Paid Amount */}
      <div className="space-y-2">
        <Label>المبلغ المدفوع</Label>
        <div className="relative">
          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            value={formData.paidAmount || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              paidAmount: Math.min(Number(e.target.value), currentPrice) 
            }))}
            placeholder="0"
            className="pr-10"
            dir="ltr"
            min={0}
            max={currentPrice}
          />
        </div>
        {remainingAmount > 0 && (
          <p className="text-sm text-destructive">
            المتبقي: {remainingAmount} جنيه
          </p>
        )}
      </div>

      <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
        متابعة للدفع
      </Button>
    </div>
  );
};