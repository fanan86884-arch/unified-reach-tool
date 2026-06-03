import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client.runtime';
import {
  Loader2, Save, CreditCard, Store, DollarSign, Users,
  Dumbbell, Footprints, Activity, ChevronDown,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCloudSettings, PricingTiers } from '@/hooks/useCloudSettings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Gender, SubscriptionCategory, SubscriptionType } from '@/types/subscriber';
import { cn } from '@/lib/utils';

const GENDER_LABEL: Record<Gender, string> = { male: 'الأولاد', female: 'البنات' };
const CATEGORY_LABEL: Record<SubscriptionCategory, string> = {
  gym: 'جيم فقط',
  gym_walking: 'جيم + مشاية',
  walking: 'مشاية فقط',
};
const CATEGORY_ICON: Record<SubscriptionCategory, React.ElementType> = {
  gym: Dumbbell,
  gym_walking: Activity,
  walking: Footprints,
};
const DURATION_LABEL: Record<SubscriptionType, string> = {
  monthly: 'شهري',
  'bi-monthly': 'شهرين',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};
const DURATION_DAYS: Record<SubscriptionType, number> = {
  monthly: 30,
  'bi-monthly': 60,
  quarterly: 90,
  'semi-annual': 180,
  annual: 365,
};
const DURATIONS: SubscriptionType[] = ['monthly', 'bi-monthly', 'quarterly', 'semi-annual', 'annual'];
const CATEGORIES: SubscriptionCategory[] = ['gym', 'gym_walking', 'walking'];
const GENDERS: Gender[] = ['male', 'female'];

export const PaymentSettings = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { pricingTiers, savePricingTiers, loading: tiersLoading } = useCloudSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [settings, setSettings] = useState({ instapayNumber: '', vodafoneCashNumber: '', storeUrl: '' });
  const [tiers, setTiers] = useState<PricingTiers | null>(null);
  const [pricesDirty, setPricesDirty] = useState(false);
  // Each gender remembers which category panel is open (default: gym)
  const [openCategory, setOpenCategory] = useState<Record<Gender, SubscriptionCategory>>({
    male: 'gym',
    female: 'gym',
  });

  // Sync local tiers when global tiers change (realtime updates from other accounts)
  useEffect(() => {
    if (pricingTiers && !pricesDirty) setTiers(pricingTiers);
  }, [pricingTiers, pricesDirty]);

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
    setPricesDirty(true);
    setTiers({
      ...tiers,
      [gender]: {
        ...tiers[gender],
        [category]: { ...tiers[gender][category], [duration]: value },
      },
    });
  };


  const handleSavePricesOnly = async () => {
    if (!tiers) return;
    setSavingPrices(true);
    try {
      await savePricingTiers(tiers);
      setPricesDirty(false);
      toast({ title: '✓ تم حفظ الأسعار', description: 'تم تحديث الأسعار لجميع الحسابات' });
    } catch (e) {
      console.error(e);
      toast({ title: t.common.error, description: t.settings.saveError, variant: 'destructive' });
    } finally {
      setSavingPrices(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('contact_settings').select('id').limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('contact_settings').update({
          instapay_number: settings.instapayNumber,
          vodafone_cash_number: settings.vodafoneCashNumber,
          store_url: settings.storeUrl,
        }).eq('id', existing.id);
        if (error) throw error;
      }
      // pricing tiers have a dedicated save button
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            أسعار الاشتراكات
            {pricesDirty && (
              <Badge variant="outline" className="text-[10px] border-warning/50 text-warning animate-pulse">
                تغييرات غير محفوظة
              </Badge>
            )}
          </h4>
          <Button
            size="sm"
            onClick={handleSavePricesOnly}
            disabled={savingPrices || !pricesDirty}
            className={cn('h-8 gap-1.5', pricesDirty && 'animate-pulse')}
          >
            {savingPrices ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            حفظ الأسعار
          </Button>
        </div>

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
            <TabsContent key={gender} value={gender} className="space-y-3 mt-4">
              <p className="text-[11px] text-muted-foreground px-1">
                عدّل كل سعر يدوياً. لا يوجد أي تغيير تلقائي على باقي الأسعار.
              </p>



              {/* Three collapsible category lists */}
              {CATEGORIES.map((category) => {
                const Icon = CATEGORY_ICON[category];
                const monthly = tiers[gender][category].monthly || 0;
                const isOpen = openCategory[gender] === category;
                return (
                  <Collapsible
                    key={category}
                    open={isOpen}
                    onOpenChange={(open) => {
                      if (open) setOpenCategory({ ...openCategory, [gender]: category });
                      else setOpenCategory({ ...openCategory, [gender]: '' as any });
                    }}
                    className="rounded-lg border bg-muted/40 overflow-hidden"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">{CATEGORY_LABEL[category]}</span>
                          {monthly > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              من {monthly} ج
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {DURATIONS.map((duration) => {
                            const price = tiers[gender][category][duration] || 0;
                            const perDay = price > 0 ? Math.round(price / DURATION_DAYS[duration]) : 0;
                            return (
                              <div key={duration} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">{DURATION_LABEL[duration]}</Label>
                                  {perDay > 0 && (
                                    <span className="text-[9px] text-muted-foreground" dir="ltr">
                                      {perDay}/يوم
                                    </span>
                                  )}
                                </div>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={0}
                                    dir="ltr"
                                    value={price || ''}
                                    onChange={(e) => updatePrice(gender, category, duration, Number(e.target.value) || 0)}
                                    placeholder="0"
                                    className="pr-8 text-center font-medium"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                                    ج
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
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

