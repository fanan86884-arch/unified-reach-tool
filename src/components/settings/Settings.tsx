import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings as SettingsIcon, 
  MessageSquare, 
  Save, 
  DollarSign, 
  LogOut, 
  Loader2,
  ChevronDown,
  History,
  FileSpreadsheet,
  User,
  Phone,
  CreditCard,
  Brain
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useCloudSettings, SubscriptionPrices } from '@/hooks/useCloudSettings';
import { useAuth } from '@/hooks/useAuth';
import { ExcelExportImport } from './ExcelExportImport';
import { ActivityLogComponent } from './ActivityLog';
import { ContactSettings } from './ContactSettings';
import { PaymentSettings } from './PaymentSettings';
import { AITrainingSettings } from './AITrainingSettings';
import { AITrainingChat } from './AITrainingChat';
import { useCloudSubscribers } from '@/hooks/useCloudSubscribers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SettingsSection = ({ title, icon: Icon, children, defaultOpen = false }: SettingsSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="card-shadow overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="font-bold">{title}</h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 border-t">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const Settings = () => {
  const [templates, setTemplates] = useState(defaultTemplates);
  const { prices, loading, savePrices } = useCloudSettings();
  const { signOut, user } = useAuth();
  const { allSubscribers, addSubscriber } = useCloudSubscribers();
  const [localPrices, setLocalPrices] = useState<SubscriptionPrices>(prices);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setLocalPrices(prices);
  }, [prices]);

  useEffect(() => {
    const savedTemplates = localStorage.getItem('whatsapp_templates');
    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates);
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
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) throw error;

      // Clear all local/session state (templates, deleted notifications, queues, etc.)
      localStorage.clear();
      sessionStorage.clear();

      // Hard redirect to prevent back navigation
      navigate('/auth', { replace: true });
      window.location.replace('/auth');
    } catch (e) {
      console.error('Sign out error:', e);
      setIsSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-primary" />
        الإعدادات
      </h2>

      {/* Activity Log - First */}
      <SettingsSection title="سجل التغييرات" icon={History} defaultOpen>
        <div className="mt-4">
          <ActivityLogComponent />
        </div>
      </SettingsSection>

      {/* Subscription Prices */}
      <SettingsSection title="أسعار الاشتراكات" icon={DollarSign}>
        <div className="grid grid-cols-2 gap-4 mt-4">
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
      </SettingsSection>

      {/* WhatsApp Templates */}
      <SettingsSection title="نماذج رسائل واتساب" icon={MessageSquare}>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            المتغيرات: {'{الاسم}'}, {'{تاريخ_الاشتراك}'}, {'{تاريخ_الانتهاء}'}, {'{المبلغ_المدفوع}'}, {'{المبلغ_المتبقي}'}, {'{المدة_المحددة}'}
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
        </div>
      </SettingsSection>

      {/* Excel Export/Import */}
      <SettingsSection title="تصدير واستيراد البيانات" icon={FileSpreadsheet}>
        <div className="mt-4">
          <ExcelExportImport subscribers={allSubscribers} onImport={addSubscriber} />
        </div>
      </SettingsSection>

      {/* Contact Settings */}
      <SettingsSection title="بيانات التواصل" icon={Phone}>
        <ContactSettings />
      </SettingsSection>

      {/* Payment Settings */}
      <SettingsSection title="بيانات الدفع والمتجر" icon={CreditCard}>
        <PaymentSettings />
      </SettingsSection>

      {/* AI Training Settings */}
      <SettingsSection title="تدريب الذكاء الاصطناعي" icon={Brain} defaultOpen>
        <div className="mt-4 space-y-6">
          <AITrainingChat />
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              أو أضف أمثلة يدوياً من هنا:
            </p>
            <AITrainingSettings />
          </div>
        </div>
      </SettingsSection>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full" disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ الإعدادات
      </Button>

      {/* Account Section */}
      <SettingsSection title="الحساب" icon={User}>
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="font-medium">البريد الإلكتروني</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="destructive" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            تسجيل الخروج
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
};
