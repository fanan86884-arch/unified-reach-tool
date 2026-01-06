import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useContactSettings, ContactInfo } from '@/hooks/useContactSettings';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';

export const ContactSettings = () => {
  const { contactInfo, saveContactInfo } = useContactSettings();
  const [localInfo, setLocalInfo] = useState<ContactInfo>(contactInfo);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalInfo(contactInfo);
  }, [contactInfo]);

  const handleCaptainChange = (index: number, field: 'name' | 'phone', value: string) => {
    setLocalInfo(prev => ({
      ...prev,
      captains: prev.captains.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addCaptain = () => {
    setLocalInfo(prev => ({
      ...prev,
      captains: [...prev.captains, { name: '', phone: '' }],
    }));
  };

  const removeCaptain = (index: number) => {
    setLocalInfo(prev => ({
      ...prev,
      captains: prev.captains.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await saveContactInfo(localInfo);
      if (success) {
        toast({ title: 'تم حفظ بيانات التواصل بنجاح' });
      } else {
        toast({ title: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>رابط الفيسبوك</Label>
          <Input
            value={localInfo.facebookUrl}
            onChange={(e) => setLocalInfo(prev => ({ ...prev, facebookUrl: e.target.value }))}
            placeholder="https://facebook.com/..."
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <Label>رابط الانستجرام</Label>
          <Input
            value={localInfo.instagramUrl}
            onChange={(e) => setLocalInfo(prev => ({ ...prev, instagramUrl: e.target.value }))}
            placeholder="https://instagram.com/..."
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">أرقامنا (واتساب)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCaptain}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة
          </Button>
        </div>

        {localInfo.captains.map((captain, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <Input
                value={captain.name}
                onChange={(e) => handleCaptainChange(index, 'name', e.target.value)}
                placeholder="الاسم"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={captain.phone}
                onChange={(e) => handleCaptainChange(index, 'phone', e.target.value)}
                placeholder="رقم الهاتف"
                dir="ltr"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-0"
              onClick={() => removeCaptain(index)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} className="w-full" disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        حفظ بيانات التواصل
      </Button>
    </div>
  );
};
