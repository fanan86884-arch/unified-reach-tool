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
  FileSpreadsheet,
  User,
  Phone,
  CreditCard,
  Bell,
  Moon,
  Sun,
  Palette
} from 'lucide-react';
import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useCloudSettings, SubscriptionPrices } from '@/hooks/useCloudSettings';
import { useAuth } from '@/hooks/useAuth';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { ExcelExportImport } from './ExcelExportImport';
import { ContactSettings } from './ContactSettings';
import { PaymentSettings } from './PaymentSettings';
import { PushNotificationSettings } from './PushNotificationSettings';
import { useCloudSubscribers } from '@/hooks/useCloudSubscribers';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SettingsSection = forwardRef<HTMLDivElement, SettingsSectionProps>(
  ({ title, icon: Icon, children, defaultOpen = false }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card ref={ref} className="card-shadow overflow-hidden">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors active:scale-[0.98] active:opacity-80">
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
  }
);
SettingsSection.displayName = 'SettingsSection';

export const Settings = () => {
  const { templates, loading: templatesLoading, updateGlobalTemplate } = useWhatsAppTemplates();
  const [localTemplates, setLocalTemplates] = useState(templates);
  const { prices, loading, savePrices } = useCloudSettings();
  const { signOut, user } = useAuth();
  const { allSubscribers, addSubscriber } = useCloudSubscribers();
  const [localPrices, setLocalPrices] = useState<SubscriptionPrices>(prices);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    setLocalPrices(prices);
  }, [prices]);

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  const handleTemplateChange = (id: string, content: string) => {
    setLocalTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content } : t))
    );
  };

  const handlePriceChange = (type: keyof SubscriptionPrices, value: number) => {
    setLocalPrices((prev) => ({ ...prev, [type]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all(localTemplates.map((template) => updateGlobalTemplate(template.id, template.content)));
      await savePrices(localPrices);
      toast({ title: t.settings.savedSuccess });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({ title: t.settings.saveError, variant: 'destructive' });
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

      localStorage.clear();
      sessionStorage.clear();

      navigate('/auth', { replace: true });
      window.location.replace('/auth');
    } catch (e) {
      console.error('Sign out error:', e);
      setIsSigningOut(false);
    }
  };

  if (loading || templatesLoading) {
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
        {t.settings.title}
      </h2>

      <SettingsSection title={t.settings.prices} icon={DollarSign} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {(Object.keys(t.subscriptionTypes) as Array<keyof typeof t.subscriptionTypes>).map((type) => (
            <div key={type} className="space-y-2">
              <Label>{t.subscriptionTypes[type]}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={localPrices[type]}
                  onChange={(e) => handlePriceChange(type, Number(e.target.value))}
                  min={0}
                  dir="ltr"
                />
                <span className="text-sm text-muted-foreground">{t.common.currency}</span>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t.settings.whatsappTemplates} icon={MessageSquare}>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t.settings.templateVariables}: {'{الاسم}'}, {'{تاريخ_الاشتراك}'}, {'{تاريخ_الانتهاء}'}, {'{المبلغ_المدفوع}'}, {'{المبلغ_المتبقي}'}, {'{المدة_المحددة}'}
          </p>
          <div className="space-y-4">
            {localTemplates.map((template) => (
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

      <SettingsSection title={t.settings.exportImport} icon={FileSpreadsheet}>
        <div className="mt-4">
          <ExcelExportImport subscribers={allSubscribers} onImport={addSubscriber} />
        </div>
      </SettingsSection>

      <SettingsSection title={t.settings.contactInfo} icon={Phone}>
        <ContactSettings />
      </SettingsSection>

      <SettingsSection title={t.settings.paymentInfo} icon={CreditCard}>
        <PaymentSettings />
      </SettingsSection>

      <SettingsSection title={t.settings.pushNotifications} icon={Bell}>
        <div className="mt-4">
          <PushNotificationSettings />
        </div>
      </SettingsSection>

      <Button onClick={handleSave} className="w-full" disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t.settings.saveSettings}
      </Button>

      <SettingsSection title={t.settings.appearance} icon={Palette}>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {document.documentElement.classList.contains('dark') ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <span className="font-medium">{t.settings.darkMode}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const root = document.documentElement;
              const isDark = root.classList.contains('dark');
              if (isDark) {
                root.classList.remove('dark');
                localStorage.setItem('theme', 'light');
              } else {
                root.classList.add('dark');
                localStorage.setItem('theme', 'dark');
              }
              // Force re-render
              window.dispatchEvent(new Event('themechange'));
            }}
          >
            {document.documentElement.classList.contains('dark') ? t.settings.lightMode : t.settings.darkMode}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title={t.settings.account} icon={User}>
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="font-medium">{t.settings.email}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="destructive" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {t.settings.signOut}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
};
