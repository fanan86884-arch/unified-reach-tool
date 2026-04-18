import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client.runtime';
import {
  Loader2, Save, CreditCard, Store, DollarSign, Users,
  Copy, RotateCcw, TrendingUp, TrendingDown, Dumbbell, Footprints, Activity,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCloudSettings, PricingTiers } from '@/hooks/useCloudSettings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Gender, SubscriptionCategory, SubscriptionType } from '@/types/subscriber';

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
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};
const DURATION_DAYS: Record<SubscriptionType, number> = {
  monthly: 30,
  quarterly: 90,
  'semi-annual': 180,
  annual: 365,
};
const DURATIONS: SubscriptionType[] = ['monthly', 'quarterly', 'semi-annual', 'annual'];
const CATEGORIES: SubscriptionCategory[] = ['gym', 'gym_walking', 'walking'];
const GENDERS: Gender[] = ['male', 'female'];

const DEFAULT_TIERS: PricingTiers = {
  male: {
    gym: { monthly: 250, quarterly: 700, 'semi-annual': 1300, annual: 2400 },
    gym_walking: { monthly: 350, quarterly: 950, 'semi-annual': 1800, annual: 3300 },
    walking: { monthly: 150, quarterly: 400, 'semi-annual': 750, annual: 1400 },
  },
  female: {
    gym: { monthly: 300, quarterly: 850, 'semi-annual': 1600, annual: 2900 },
    gym_walking: { monthly: 400, quarterly: 1100, 'semi-annual': 2050, annual: 3800 },
    walking: { monthly: 200, quarterly: 550, 'semi-annual': 1000, annual: 1850 },
  },
};

export const PaymentSettings = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { pricingTiers, savePricingTiers, loading: tiersLoading } = useCloudSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ instapayNumber: '', vodafoneCashNumber: '', storeUrl: '' });
  const [tiers, setTiers] = useState<PricingTiers | null>(null);
  const [bulkPercent, setBulkPercent] = useState<string>('');

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
        [category]: { ...tiers[gender][category], [duration]: value },
      },
    });
  };

  const copyMaleToFemale = () => {
    if (!tiers) return;
    setTiers({ ...tiers, female: JSON.parse(JSON.stringify(tiers.male)) });
    toast({ title: 'تم النسخ', description: 'تم نسخ أسعار الأولاد إلى البنات' });
  };

  const copyFemaleToMale = () => {
    if (!tiers) return;
    setTiers({ ...tiers, male: JSON.parse(JSON.stringify(tiers.female)) });
    toast({ title: 'تم النسخ', description: 'تم نسخ أسعار البنات إلى الأولاد' });
  };

  const resetGender = (gender: Gender) => {
    if (!tiers) return;
    setTiers({ ...tiers, [gender]: JSON.parse(JSON.stringify(DEFAULT_TIERS[gender])) });
    toast({ title: 'تم الإرجاع', description: `تم إرجاع أسعار ${GENDER_LABEL[gender]} للقيم الافتراضية` });
  };

  const applyBulkAdjust = (gender: Gender, sign: 1 | -1) => {
    const pct = Number(bulkPercent);
    if (!tiers || !pct || pct <= 0) {
      toast({ title: 'أدخل نسبة صحيحة', variant: 'destructive' });
      return;
    }
    const factor = 1 + (sign * pct) / 100;
    const newGender: any = {};
    for (const cat of CATEGORIES) {
      newGender[cat] = {} as any;
      for (const dur of DURATIONS) {
        newGender[cat][dur] = Math.max(0, Math.round(tiers[gender][cat][dur] * factor));
      }
    }
    setTiers({ ...tiers, [gender]: newGender });
    toast({
      title: sign > 0 ? 'تمت الزيادة' : 'تم الخصم',
      description: `${pct}% على أسعار ${GENDER_LABEL[gender]}`,
    });
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
      if (tiers) await savePricingTiers(tiers);
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
          </h4>
          <Badge variant="outline" className="text-[10px]">
            {GENDERS.length * CATEGORIES.length * DURATIONS.length} سعر
          </Badge>
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
            <TabsContent key={gender} value={gender} className="space-y-4 mt-4">
              {/* Quick actions toolbar */}
              <div className="rounded-lg border bg-card/50 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">أدوات سريعة</p>

                {/* Bulk adjust */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={bulkPercent}
                      onChange={(e) => setBulkPercent(e.target.value)}
                      placeholder="٪"
                      dir="ltr"
                      className="h-8 text-center"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyBulkAdjust(gender, 1)}>
                    <TrendingUp className="w-3.5 h-3.5 ml-1" />
                    زيادة
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => applyBulkAdjust(gender, -1)}>
                    <TrendingDown className="w-3.5 h-3.5 ml-1" />
                    خصم
                  </Button>
                </div>

                {/* Copy + reset */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={gender === 'male' ? copyFemaleToMale : copyMaleToFemale}
                  >
                    <Copy className="w-3.5 h-3.5 ml-1" />
                    نسخ من {gender === 'male' ? 'البنات' : 'الأولاد'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:text-destructive">
                        <RotateCcw className="w-3.5 h-3.5 ml-1" />
                        افتراضي
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>إرجاع للأسعار الافتراضية؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم إرجاع كل أسعار {GENDER_LABEL[gender]} للقيم الافتراضية. لن يتم الحفظ تلقائياً.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => resetGender(gender)}>تأكيد</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Pricing cards per category */}
              {CATEGORIES.map((category) => {
                const Icon = CATEGORY_ICON[category];
                const monthly = tiers[gender][category].monthly || 0;
                return (
                  <div key={category} className="space-y-3 p-3 rounded-lg border bg-muted/40">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {CATEGORY_LABEL[category]}
                      </p>
                      {monthly > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {monthly} ج / شهر
                        </span>
                      )}
                    </div>
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
