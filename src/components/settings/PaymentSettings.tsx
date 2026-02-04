import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client.runtime';
import { Loader2, Save, CreditCard, Store } from 'lucide-react';

export const PaymentSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    instapayNumber: '',
    vodafoneCashNumber: '',
    storeUrl: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('contact_settings')
          .select('instapay_number, vodafone_cash_number, store_url')
          .limit(1)
          .maybeSingle();

        if (data) {
          setSettings({
            instapayNumber: data.instapay_number || '',
            vodafoneCashNumber: data.vodafone_cash_number || '',
            storeUrl: data.store_url || '',
          });
        }
      } catch (e) {
        console.error('Error fetching settings:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('contact_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('contact_settings')
          .update({
            instapay_number: settings.instapayNumber,
            vodafone_cash_number: settings.vodafoneCashNumber,
            store_url: settings.storeUrl,
          })
          .eq('id', existing.id);

        if (error) throw error;
      }

      toast({ title: 'تم حفظ الإعدادات بنجاح' });
    } catch (e) {
      console.error('Error saving settings:', e);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ الإعدادات',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          بيانات الدفع
        </h4>
        
        <div className="space-y-2">
          <Label>رقم Instapay</Label>
          <Input
            value={settings.instapayNumber}
            onChange={(e) => setSettings(prev => ({ ...prev, instapayNumber: e.target.value }))}
            placeholder="أدخل رقم Instapay"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label>رقم Vodafone Cash</Label>
          <Input
            value={settings.vodafoneCashNumber}
            onChange={(e) => setSettings(prev => ({ ...prev, vodafoneCashNumber: e.target.value }))}
            placeholder="أدخل رقم Vodafone Cash"
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          رابط المتجر
        </h4>
        
        <div className="space-y-2">
          <Label>رابط 2B Store</Label>
          <Input
            value={settings.storeUrl}
            onChange={(e) => setSettings(prev => ({ ...prev, storeUrl: e.target.value }))}
            placeholder="https://example.com/store"
            dir="ltr"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ
      </Button>
    </div>
  );
};