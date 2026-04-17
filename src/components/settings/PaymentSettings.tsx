import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client.runtime';
import { Loader2, Save, CreditCard, Store, DollarSign, Users } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCloudSettings, PricingTiers } from '@/hooks/useCloudSettings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Gender, SubscriptionCategory, SubscriptionType } from '@/types/subscriber';

const GENDER_LABEL: Record<Gender, string> = { male: 'الأولاد', female: 'البنات' };
const CATEGORY_LABEL: Record<SubscriptionCategory, string> = {
  gym: 'جيم فقط',
  gym_walking: 'جيم + مشاية',
  walking: 'مشاية فقط',
};
const DURATION_LABEL: Record<SubscriptionType, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};
const DURATIONS: SubscriptionType[] = ['monthly', 'quarterly', 'semi-annual', 'annual'];
const CATEGORIES: SubscriptionCategory[] = ['gym', 'gym_walking', 'walking'];
const GENDERS: Gender[] = ['male', 'female'];

export const PaymentSettings = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { pricingTiers, savePricingTiers, loading: tiersLoading } = useCloudSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ instapayNumber: '', vodafoneCashNumber: '', storeUrl: '' });
  const [tiers, setTiers] = useState<PricingTiers | null>(null);

  useEffect(() => {
    if (pricingTiers && !tiers) setTiers(pricingTiers);
  }, [pricingTiers, tiers]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('contact_settings').select('instapay_number, vodafone_cash_number, store_url').limit(1).maybeSingle();
        if (data) {
          setSettings({ instapayNumber: data.instapay_number || '', vodafoneCashNumber: data.vodafone_cash_number || '', storeUrl: data.store_url || '' });
        }
      } catch (e) { console.error('Error fetching settings:', e); }
      finally { setLoading(false); }
    };
    fetchSettings();
  }, []);

  const updatePrice = (gender: Gender, category: SubscriptionCategory, duration: SubscriptionType, value: number) => {
    if (!tiers) return;
    setTiers({
      ...tiers,
      [gender]: {
        ...tiers[gender],
        [category]: {
          ...tiers[gender][category],
          [duration]: value,
        },
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('contact_settings').select('id').limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('contact_settings').update({
          instapay_number: settings.instapayNumber, vodafone_cash_number: settings.vodafoneCashNumber, store_url: settings.storeUrl,
        }).eq('id', existing.id);
        if (error) throw error;
      }
      if (tiers) {
        await savePricingTiers(tiers);
      }
      toast({ title: t.settings.savedSuccess });
    } catch (e) {
      console.error('Error saving settings:', e);
      toast({ title: t.common.error, description: t.settings.saveError, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading || tiersLoading || !tiers) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Pricing Matrix */}
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />أسعار الاشتراكات</h4>
        <Tabs defaultValue="male" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {GENDERS.map((g) => (
              <TabsTrigger key={g} value={g}>
                <Users className="w-3.5 h-3.5 ml-1.5" />
                {GENDER_LABEL[g]}
              </TabsTrigger>
            ))}
          </TabsList>
          {GENDERS.map((gender) => (
            <TabsContent key={gender} value={gender} className="space-y-4 mt-4">
              {CATEGORIES.map((category) => (
                <div key={category} className="space-y-2 p-3 rounded-lg bg-muted/40">
                  <p className="text-sm font-semibold text-primary">{CATEGORY_LABEL[category]}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DURATIONS.map((duration) => (
                      <div key={duration} className="space-y-1">
                        <Label className="text-xs">{DURATION_LABEL[duration]}</Label>
                        <Input
                          type="number"
                          min={0}
                          dir="ltr"
                          value={tiers[gender][category][duration] || ''}
                          onChange={(e) => updatePrice(gender, category, duration, Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" />{t.settings.paymentData}</h4>
        <div className="space-y-2">
          <Label>{t.settings.instapayNumber}</Label>
          <Input value={settings.instapayNumber} onChange={(e) => setSettings(prev => ({ ...prev, instapayNumber: e.target.value }))} placeholder={t.settings.instapayPlaceholder} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>{t.settings.vodafoneCashNumber}</Label>
          <Input value={settings.vodafoneCashNumber} onChange={(e) => setSettings(prev => ({ ...prev, vodafoneCashNumber: e.target.value }))} placeholder={t.settings.vodafoneCashPlaceholder} dir="ltr" />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center gap-2"><Store className="w-4 h-4 text-primary" />{t.settings.storeLink}</h4>
        <div className="space-y-2">
          <Label>{t.settings.storeLinkLabel}</Label>
          <Input value={settings.storeUrl} onChange={(e) => setSettings(prev => ({ ...prev, storeUrl: e.target.value }))} placeholder="https://example.com/store" dir="ltr" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t.common.save}
      </Button>
    </div>
  );
};
