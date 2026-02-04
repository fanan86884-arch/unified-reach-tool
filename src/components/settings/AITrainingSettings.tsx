import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, Plus, Trash2, Salad, Dumbbell, 
  Save, X, FileText, Loader2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TrainingExample {
  id: string;
  type: 'diet' | 'workout';
  title: string;
  client_data: Record<string, unknown>;
  plan_content: string;
  is_active: boolean;
  created_at: string;
}

export const AITrainingSettings = () => {
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'diet' as 'diet' | 'workout',
    title: '',
    plan_content: '',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExamples();
  }, []);

  const fetchExamples = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_training_examples')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExamples(data as TrainingExample[]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.plan_content) {
      toast({ title: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('ai_training_examples').insert({
        type: formData.type,
        title: formData.title,
        client_data: {},
        plan_content: formData.plan_content,
      });

      if (error) throw error;

      toast({ title: 'تم حفظ المثال بنجاح ✓' });
      setIsDialogOpen(false);
      setFormData({ type: 'diet', title: '', plan_content: '' });
      fetchExamples();
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ في الحفظ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await supabase
      .from('ai_training_examples')
      .update({ is_active: isActive })
      .eq('id', id);
    
    setExamples(prev => 
      prev.map(ex => ex.id === id ? { ...ex, is_active: isActive } : ex)
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا المثال؟')) return;
    
    await supabase.from('ai_training_examples').delete().eq('id', id);
    setExamples(prev => prev.filter(ex => ex.id !== id));
    toast({ title: 'تم الحذف' });
  };

  // Export function to save from plan (can be used by other components)
  const handleSaveFromPlan = async (plan: { 
    type: 'diet' | 'workout'; 
    name: string; 
    content: string;
    clientData: Record<string, unknown>;
  }) => {
    try {
      const insertData = {
        type: plan.type,
        title: `مثال من ${plan.name}`,
        client_data: plan.clientData as unknown,
        plan_content: plan.content,
      };
      // @ts-ignore - type casting for Supabase insert
      await supabase.from('ai_training_examples').insert(insertData);
      toast({ title: 'تم حفظ المثال للتدريب ✓' });
      fetchExamples();
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ في الحفظ', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-bold">تدريب الذكاء الاصطناعي</h3>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة مثال
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        أضف أمثلة من أنظمتك الغذائية وبرامج التمرين لتدريب الذكاء الاصطناعي على أسلوبك الخاص
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : examples.length === 0 ? (
        <Card className="p-8 text-center">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            لا توجد أمثلة للتدريب بعد
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            أضف أمثلة من أنظمتك المفضلة ليتعلم منها الذكاء الاصطناعي
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {examples.map((example) => (
            <Card key={example.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    example.type === 'diet' 
                      ? 'bg-primary/10' 
                      : 'bg-orange-500/10'
                  }`}>
                    {example.type === 'diet' 
                      ? <Salad className="w-5 h-5 text-primary" />
                      : <Dumbbell className="w-5 h-5 text-orange-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{example.title}</span>
                      <Badge variant={example.is_active ? 'default' : 'secondary'} className="shrink-0">
                        {example.is_active ? 'مفعّل' : 'معطّل'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(example.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch 
                    checked={example.is_active} 
                    onCheckedChange={(checked) => handleToggle(example.id, checked)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive"
                    onClick={() => handleDelete(example.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              إضافة مثال للتدريب
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">النوع</label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as 'diet' | 'workout' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diet">
                    <div className="flex items-center gap-2">
                      <Salad className="w-4 h-4" />
                      نظام غذائي
                    </div>
                  </SelectItem>
                  <SelectItem value="workout">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4" />
                      برنامج تمرين
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">عنوان المثال</label>
              <Input 
                placeholder="مثلاً: نظام غذائي للتنشيف"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">محتوى النظام</label>
              <Textarea 
                placeholder="الصق محتوى النظام الغذائي أو برنامج التمرين هنا..."
                value={formData.plan_content}
                onChange={(e) => setFormData({ ...formData, plan_content: e.target.value })}
                className="min-h-[200px]"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                حفظ المثال
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <X className="w-4 h-4 ml-1" />
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
