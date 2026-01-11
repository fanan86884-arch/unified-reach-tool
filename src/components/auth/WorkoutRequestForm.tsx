import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Dumbbell, CheckCircle } from 'lucide-react';

interface WorkoutRequestFormProps {
  phone: string;
  name: string;
}

export const WorkoutRequestForm = ({ phone, name }: WorkoutRequestFormProps) => {
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [trainingLevel, setTrainingLevel] = useState('');
  const [trainingLocation, setTrainingLocation] = useState('');
  const [trainingDays, setTrainingDays] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!weight || !goal || !trainingLevel || !trainingLocation || !trainingDays || !sessionDuration) {
      toast({ title: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('workout_requests').insert({
        name,
        phone,
        weight: parseFloat(weight),
        goal,
        training_level: trainingLevel,
        training_location: trainingLocation,
        training_days: parseInt(trainingDays),
        session_duration: parseInt(sessionDuration),
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({ title: 'تم إرسال طلبك بنجاح' });
    } catch (err) {
      console.error('Error submitting workout request:', err);
      toast({ title: 'حدث خطأ أثناء إرسال الطلب', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">تم إرسال طلبك!</h3>
        <p className="text-muted-foreground">سيتم الرد على طلبك قريباً</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>الوزن (كجم)</Label>
        <Input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="مثال: 75"
          dir="ltr"
        />
      </div>

      <div className="space-y-2">
        <Label>الهدف</Label>
        <Select value={goal} onValueChange={setGoal}>
          <SelectTrigger>
            <SelectValue placeholder="اختر الهدف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weight_loss">خسارة وزن</SelectItem>
            <SelectItem value="muscle_gain">بناء عضلات</SelectItem>
            <SelectItem value="strength">زيادة القوة</SelectItem>
            <SelectItem value="fitness">لياقة عامة</SelectItem>
            <SelectItem value="flexibility">مرونة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>مستوى التمرين</Label>
        <Select value={trainingLevel} onValueChange={setTrainingLevel}>
          <SelectTrigger>
            <SelectValue placeholder="اختر مستوى التمرين" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">مبتدئ</SelectItem>
            <SelectItem value="intermediate">متوسط</SelectItem>
            <SelectItem value="advanced">متقدم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>مكان التمرين</Label>
        <Select value={trainingLocation} onValueChange={setTrainingLocation}>
          <SelectTrigger>
            <SelectValue placeholder="اختر مكان التمرين" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gym">الجيم</SelectItem>
            <SelectItem value="home">المنزل</SelectItem>
            <SelectItem value="outdoor">في الخارج</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>عدد أيام التمرين في الأسبوع</Label>
        <Select value={trainingDays} onValueChange={setTrainingDays}>
          <SelectTrigger>
            <SelectValue placeholder="اختر عدد الأيام" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">يومان</SelectItem>
            <SelectItem value="3">3 أيام</SelectItem>
            <SelectItem value="4">4 أيام</SelectItem>
            <SelectItem value="5">5 أيام</SelectItem>
            <SelectItem value="6">6 أيام</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>مدة الحصة (بالدقائق)</Label>
        <Select value={sessionDuration} onValueChange={setSessionDuration}>
          <SelectTrigger>
            <SelectValue placeholder="اختر مدة الحصة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 دقيقة</SelectItem>
            <SelectItem value="45">45 دقيقة</SelectItem>
            <SelectItem value="60">ساعة</SelectItem>
            <SelectItem value="90">ساعة ونصف</SelectItem>
            <SelectItem value="120">ساعتان</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            جاري الإرسال...
          </>
        ) : (
          <>
            <Dumbbell className="w-4 h-4 ml-2" />
            إرسال الطلب
          </>
        )}
      </Button>
    </form>
  );
};
