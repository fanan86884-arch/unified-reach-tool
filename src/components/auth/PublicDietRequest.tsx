import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { DietRequestForm } from './DietRequestForm';
import { normalizeEgyptPhoneDigits } from '@/lib/phone';
import { useToast } from '@/hooks/use-toast';

/**
 * Public diet request: collects phone first, then opens the regular diet form.
 * No subscriber DB lookup is required - anyone can submit.
 */
export const PublicDietRequest = () => {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [confirmedPhone, setConfirmedPhone] = useState<string | null>(null);

  const handleConfirm = () => {
    const normalized = normalizeEgyptPhoneDigits(phone);
    if (!normalized) {
      toast({ title: 'خطأ', description: 'رقم الهاتف غير صحيح', variant: 'destructive' });
      return;
    }
    setConfirmedPhone(normalized);
  };

  if (confirmedPhone) {
    return <DietRequestForm phone={confirmedPhone} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        أدخل رقم موبايلك أولاً للمتابعة لإرسال طلب نظام غذائي
      </p>
      <div className="space-y-2">
        <Label>رقم الموبايل</Label>
        <div className="relative">
          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            dir="ltr"
            className="pr-10"
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </div>
      </div>
      <Button onClick={handleConfirm} className="w-full" disabled={!phone.trim()}>
        متابعة
      </Button>
    </div>
  );
};
