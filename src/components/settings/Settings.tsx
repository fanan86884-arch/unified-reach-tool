import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, MessageSquare, Save } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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
];

export const Settings = () => {
  const [templates, setTemplates] = useState(defaultTemplates);
  const { toast } = useToast();

  const handleTemplateChange = (id: string, content: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content } : t))
    );
  };

  const handleSave = () => {
    localStorage.setItem('whatsapp_templates', JSON.stringify(templates));
    toast({ title: 'تم حفظ القوالب بنجاح' });
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-primary" />
        الإعدادات
      </h2>

      <Card className="p-4 card-shadow">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          نماذج رسائل واتساب
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          يمكنك استخدام المتغيرات التالية: {'{الاسم}'}, {'{تاريخ_الاشتراك}'},{' '}
          {'{تاريخ_الانتهاء}'}, {'{المبلغ_المدفوع}'}, {'{المبلغ_المتبقي}'}
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

        <Button onClick={handleSave} className="mt-4 w-full">
          <Save className="w-4 h-4" />
          حفظ القوالب
        </Button>
      </Card>
    </div>
  );
};
