import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Salad, CheckCircle } from 'lucide-react';
import { toEnglishDigits } from '@/lib/phone';

interface DietRequestFormProps {
  phone: string;
  name?: string;
}

export const DietRequestForm = ({ phone, name: initialName }: DietRequestFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialName || '',
    weight: '',
    height: '',
    age: '',
    gender: '',
    activityLevel: '',
    goal: '',
    sleepTime: '',
    wakeTime: '',
    mealsCount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!formData.name || !formData.weight || !formData.height || !formData.age || 
        !formData.gender || !formData.activityLevel || !formData.goal || 
        !formData.sleepTime || !formData.wakeTime || !formData.mealsCount) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('diet_requests').insert({
        name: formData.name.trim(),
        phone: toEnglishDigits(phone),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        age: parseInt(formData.age),
        gender: formData.gender,
        activity_level: formData.activityLevel,
        goal: formData.goal,
        sleep_time: formData.sleepTime,
        wake_time: formData.wakeTime,
        meals_count: parseInt(formData.mealsCount),
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({ title: 'تم إرسال طلب النظام الغذائي بنجاح' });
    } catch (err) {
      console.error('Diet request error:', err);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال الطلب',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="font-bold text-lg mb-2">تم إرسال طلبك بنجاح!</h3>
        <p className="text-muted-foreground text-sm">
          سيتم مراجعة طلبك والرد عليك قريباً
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-primary mb-4">
        <Salad className="w-5 h-5" />
        <span className="font-medium">بيانات النظام الغذائي</span>
      </div>

      <div className="space-y-2">
        <Label>الاسم</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="أدخل اسمك"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>الوزن (كجم)</Label>
          <Input
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            placeholder="70"
            min={30}
            max={300}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>الطول (سم)</Label>
          <Input
            type="number"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            placeholder="170"
            min={100}
            max={250}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>السن</Label>
          <Input
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="25"
            min={10}
            max={100}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>النوع</Label>
          <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
            <SelectTrigger>
              <SelectValue placeholder="اختر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">ذكر</SelectItem>
              <SelectItem value="female">أنثى</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>مستوى النشاط</Label>
        <Select value={formData.activityLevel} onValueChange={(v) => setFormData({ ...formData, activityLevel: v })}>
          <SelectTrigger>
            <SelectValue placeholder="اختر مستوى النشاط" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">خامل (قليل الحركة)</SelectItem>
            <SelectItem value="moderate">متوسط النشاط</SelectItem>
            <SelectItem value="active">نشيط جداً</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>الهدف</Label>
        <Select value={formData.goal} onValueChange={(v) => setFormData({ ...formData, goal: v })}>
          <SelectTrigger>
            <SelectValue placeholder="اختر هدفك" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weight_loss">خسارة وزن</SelectItem>
            <SelectItem value="maintain">ثبات الوزن</SelectItem>
            <SelectItem value="muscle_gain">زيادة كتلة عضلية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>وقت النوم</Label>
          <Input
            type="time"
            value={formData.sleepTime}
            onChange={(e) => setFormData({ ...formData, sleepTime: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>وقت الاستيقاظ</Label>
          <Input
            type="time"
            value={formData.wakeTime}
            onChange={(e) => setFormData({ ...formData, wakeTime: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>عدد الوجبات التي تستطيع الالتزام بها</Label>
        <Select value={formData.mealsCount} onValueChange={(v) => setFormData({ ...formData, mealsCount: v })}>
          <SelectTrigger>
            <SelectValue placeholder="اختر عدد الوجبات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">وجبتين</SelectItem>
            <SelectItem value="3">3 وجبات</SelectItem>
            <SelectItem value="4">4 وجبات</SelectItem>
            <SelectItem value="5">5 وجبات</SelectItem>
            <SelectItem value="6">6 وجبات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'إرسال الطلب'
        )}
      </Button>
    </form>
  );
};
