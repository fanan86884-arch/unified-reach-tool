import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Send, Copy, Check, User, Salad, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildWhatsAppLink } from '@/lib/phone';

interface DietRequest {
  id: string;
  name: string;
  phone: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
  sleep_time: string;
  wake_time: string;
  meals_count: number;
  status: string;
  admin_response: string | null;
  created_at: string;
}

const goalLabels: Record<string, string> = {
  weight_loss: 'خسارة وزن',
  maintain: 'ثبات الوزن',
  muscle_gain: 'زيادة كتلة عضلية',
};

const activityLabels: Record<string, string> = {
  sedentary: 'خامل',
  moderate: 'متوسط',
  active: 'نشيط',
};

const genderLabels: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
};

export const AIDietGenerator = () => {
  const [dietRequests, setDietRequests] = useState<DietRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DietRequest | null>(null);
  const [generatedDiet, setGeneratedDiet] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Fetch pending diet requests
  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('diet_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (data) setDietRequests(data);
    };

    fetchRequests();

    const channel = supabase
      .channel('diet_requests_ai')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_requests' }, fetchRequests)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateDietWithAI = async (request: DietRequest) => {
    setIsGenerating(true);
    setSelectedRequest(request);
    setGeneratedDiet('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-diet', {
        body: {
          dietRequest: {
            name: request.name,
            weight: request.weight,
            height: request.height,
            age: request.age,
            gender: request.gender,
            activityLevel: request.activity_level,
            goal: request.goal,
            sleepTime: request.sleep_time,
            wakeTime: request.wake_time,
            mealsCount: request.meals_count,
          }
        }
      });

      if (error) throw error;
      
      setGeneratedDiet(data.dietPlan);
      toast({ title: `تم إنشاء النظام (${data.targetCalories} سعرة)` });
    } catch (err) {
      console.error('Error generating diet:', err);
      toast({ title: 'خطأ في إنشاء النظام الغذائي', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToWhatsApp = async () => {
    if (!selectedRequest || !generatedDiet) return;
    
    setIsSending(true);
    try {
      // Update the request with the response
      await supabase
        .from('diet_requests')
        .update({ 
          status: 'responded',
          admin_response: generatedDiet
        })
        .eq('id', selectedRequest.id);

      // Open WhatsApp with the diet plan
      const message = `مرحباً ${selectedRequest.name}! 🏋️‍♂️

هذا هو نظامك الغذائي المخصص:

${generatedDiet}

2B GYM - نحو جسم أفضل 💪`;

      const whatsappUrl = `${buildWhatsAppLink(selectedRequest.phone)}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast({ title: 'تم إرسال النظام بنجاح' });
      
      // Reset state
      setSelectedRequest(null);
      setGeneratedDiet('');
      
      // Remove from list
      setDietRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
    } catch (err) {
      console.error('Error sending diet:', err);
      toast({ title: 'خطأ في إرسال النظام', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDiet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    if (selectedRequest) {
      generateDietWithAI(selectedRequest);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-bold">مولد الأنظمة الغذائية بالذكاء الاصطناعي</h3>
      </div>

      {/* Pending requests */}
      {dietRequests.length > 0 && !selectedRequest && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">طلبات في الانتظار ({dietRequests.length})</p>
          {dietRequests.map((req) => (
            <Card key={req.id} className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => generateDietWithAI(req)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{req.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {goalLabels[req.goal]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.weight}كجم • {req.height}سم • {req.age} سنة
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activityLabels[req.activity_level]} • {req.meals_count} وجبات
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0">
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* No requests */}
      {dietRequests.length === 0 && !selectedRequest && (
        <div className="text-center py-12">
          <Salad className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">لا توجد طلبات في الانتظار</p>
          <p className="text-sm text-muted-foreground">ستظهر طلبات الأنظمة الغذائية هنا</p>
        </div>
      )}

      {/* Selected request - generating */}
      {selectedRequest && (
        <Card className="p-4 border-primary">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedRequest.name}</p>
              <p className="text-sm text-muted-foreground">
                {genderLabels[selectedRequest.gender]} • {selectedRequest.age} سنة • {goalLabels[selectedRequest.goal]}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="mr-auto"
              onClick={() => {
                setSelectedRequest(null);
                setGeneratedDiet('');
              }}
            >
              إلغاء
            </Button>
          </div>

          {isGenerating ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">جاري إنشاء النظام الغذائي...</p>
              <p className="text-sm text-muted-foreground">يستخدم الذكاء الاصطناعي لتخصيص النظام</p>
            </div>
          ) : generatedDiet ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary">النظام الغذائي المقترح:</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleRegenerate}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-64">
                <Textarea
                  value={generatedDiet}
                  onChange={(e) => setGeneratedDiet(e.target.value)}
                  className="min-h-[250px] text-sm leading-relaxed"
                  dir="rtl"
                />
              </ScrollArea>

              <Button 
                className="w-full" 
                onClick={handleSendToWhatsApp}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Send className="w-4 h-4 ml-2" />
                )}
                إرسال للعميل عبر واتساب
              </Button>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
};
