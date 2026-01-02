import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, MessageSquare, Save, DollarSign, LogOut, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCloudSettings, SubscriptionPrices } from '@/hooks/useCloudSettings';
import { useAuth } from '@/hooks/useAuth';
import { ExcelExportImport } from './ExcelExportImport';
import { useCloudSubscribers } from '@/hooks/useCloudSubscribers';

const defaultTemplates = [
  {
    id: 'subscription',
    name: 'رسالة الاشتراك',
    content:
      'تم الاشتراك في الجيم بتاريخ {تاريخ_الاشتراك} وتم دفع {المبلغ_المدفوع} جنيه والمتبقي {المبلغ_المتبقي} جنيه. ينتهي الاشتراك بتاريخ {تاريخ_الانتهاء}',
  },
  {
    id: 'reminder',
    name: 'تذكير بالمبلغ المتبقي',
    content:
      'مرحباً {الاسم}، نود تذكيرك بأن لديك مبلغ متبقي {المبلغ_المتبقي} جنيه. يرجى التواصل معنا لتسديد المبلغ.',
  },
  {
    id: 'expiry',
    name: 'تنبيه انتهاء الاشتراك',
    content:
      'مرحباً {الاسم}، اشتراكك سينتهي بتاريخ {تاريخ_الانتهاء}. يرجى التواصل معنا للتجديد.',
  },
  {
    id: 'expired',
    name: 'اشتراك منتهي',
    content:
      'مرحباً {الاسم}، انتهى اشتراكك في الجيم. نفتقدك! تواصل معنا لتجديد اشتراكك والعودة للتمرين.',
  },
  {
    id: 'paused',
    name: 'اشتراك موقوف',
    content:
      'مرحباً {الاسم}، نود أن نخبرك بأنه تم إيقاف اشتراكك لمدة {المدة_المحددة} وأنه سينتهي اشتراكك بتاريخ {تاريخ_الانتهاء}',
  },
];

const subscriptionLabels = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

export const Settings = () => {
  const [templates, setTemplates] = useState(defaultTemplates);
  const { prices, loading, savePrices } = useCloudSettings();
  const { signOut, user } = useAuth();
  const { allSubscribers, addSubscriber } = useCloudSubscribers();
  const [localPrices, setLocalPrices] = useState<SubscriptionPrices>(prices);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalPrices(prices);
  }, [prices]);

  useEffect(() => {
    const savedTemplates = localStorage.getItem('whatsapp_templates');
    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates);
      // Merge with default templates to include new ones
      const merged = defaultTemplates.map(defaultT => {
        const saved = parsed.find((t: any) => t.id === defaultT.id);
        return saved || defaultT;
      });
      setTemplates(merged);
    }
  }, []);

  const handleTemplateChange = (id: string, content: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content } : t))
    );
  };

  const handlePriceChange = (type: keyof SubscriptionPrices, value: number) => {
    setLocalPrices((prev) => ({ ...prev, [type]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('whatsapp_templates', JSON.stringify(templates));
      await savePrices(localPrices);
      toast({ title: 'تم حفظ الإعدادات بنجاح' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-primary" />
        الإعدادات
      </h2>

      <Card className="p-4 card-shadow">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          أسعار الاشتراكات
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(subscriptionLabels) as Array<keyof typeof subscriptionLabels>).map((type) => (
            <div key={type} className="space-y-2">
              <Label>{subscriptionLabels[type]}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={localPrices[type]}
                  onChange={(e) => handlePriceChange(type, Number(e.target.value))}
                  min={0}
                  dir="ltr"
                />
                <span className="text-sm text-muted-foreground">جنيه</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 card-shadow">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          نماذج رسائل واتساب
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          يمكنك استخدام المتغيرات التالية: {'{الاسم}'}, {'{تاريخ_الاشتراك}'},{' '}
          {'{تاريخ_الانتهاء}'}, {'{المبلغ_المدفوع}'}, {'{المبلغ_المتبقي}'}, {'{المدة_المحددة}'}
        </p>

        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="space-y-2">
              <Label>{template.name}</Label>
              <Textarea
                value={template.content}
                onChange={(e) => handleTemplateChange(template.id, e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Excel Export/Import */}
      <ExcelExportImport subscribers={allSubscribers} onImport={addSubscriber} />

      <Button onClick={handleSave} className="w-full" disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ الإعدادات
      </Button>

      <Card className="p-4 card-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">الحساب</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </Card>
    </div>
  );
};
