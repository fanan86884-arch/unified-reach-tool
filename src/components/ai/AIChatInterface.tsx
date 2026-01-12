import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Send, Loader2, User, Salad, Dumbbell, 
  Check, Copy, MessageSquare, History, X, Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildWhatsAppLink } from '@/lib/phone';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
  created_at: string;
}

interface WorkoutRequest {
  id: string;
  name: string;
  phone: string;
  weight: number;
  goal: string;
  training_level: string;
  training_location: string;
  training_days: number;
  session_duration: number;
  status: string;
  created_at: string;
}

interface DietPlan {
  id: string;
  client_name: string;
  client_phone: string;
  plan_content: string;
  status: string;
  created_at: string;
}

interface AIChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const goalLabels: Record<string, string> = {
  weight_loss: 'خسارة وزن',
  maintain: 'ثبات الوزن',
  muscle_gain: 'زيادة كتلة عضلية',
  strength: 'زيادة القوة',
  fitness: 'لياقة عامة',
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diet`;

export const AIChatInterface = ({ open, onOpenChange }: AIChatInterfaceProps) => {
  const [activeTab, setActiveTab] = useState<'diet' | 'workout' | 'history'>('diet');
  const [dietRequests, setDietRequests] = useState<DietRequest[]>([]);
  const [workoutRequests, setWorkoutRequests] = useState<WorkoutRequest[]>([]);
  const [savedPlans, setSavedPlans] = useState<DietPlan[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DietRequest | WorkoutRequest | null>(null);
  const [requestType, setRequestType] = useState<'diet' | 'workout'>('diet');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch requests
  useEffect(() => {
    const fetchData = async () => {
      const [dietRes, workoutRes, plansRes] = await Promise.all([
        supabase.from('diet_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('workout_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('diet_plans').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      if (dietRes.data) setDietRequests(dietRes.data);
      if (workoutRes.data) setWorkoutRequests(workoutRes.data);
      if (plansRes.data) setSavedPlans(plansRes.data as DietPlan[]);
    };

    if (open) fetchData();
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectDietRequest = async (request: DietRequest) => {
    setSelectedRequest(request);
    setRequestType('diet');
    setMessages([]);
    setCurrentPlan('');
    
    // Send initial message to generate diet
    const initialMessage = `أنشئ نظام غذائي يومي مفصل لـ ${request.name}`;
    await sendMessage(initialMessage, request);
  };

  const handleSelectWorkoutRequest = async (request: WorkoutRequest) => {
    setSelectedRequest(request);
    setRequestType('workout');
    setMessages([]);
    setCurrentPlan('');
    
    // Generate workout plan
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          workoutRequest: {
            name: request.name,
            weight: request.weight,
            goal: request.goal,
            trainingLevel: request.training_level,
            trainingLocation: request.training_location,
            trainingDays: request.training_days,
            sessionDuration: request.session_duration,
          }
        }
      });

      if (error) throw error;
      
      setCurrentPlan(data.workoutPlan);
      setMessages([
        { role: 'user', content: `أنشئ برنامج تمرين أسبوعي لـ ${request.name}` },
        { role: 'assistant', content: data.workoutPlan }
      ]);
    } catch (err) {
      console.error('Error generating workout:', err);
      toast({ title: 'خطأ في إنشاء البرنامج', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText: string, request?: DietRequest) => {
    const targetRequest = request || (selectedRequest as DietRequest);
    if (!targetRequest || requestType !== 'diet') return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const clientData = {
        name: targetRequest.name,
        weight: targetRequest.weight,
        height: targetRequest.height,
        age: targetRequest.age,
        gender: targetRequest.gender,
        activityLevel: targetRequest.activity_level,
        goal: targetRequest.goal,
        sleepTime: targetRequest.sleep_time,
        wakeTime: targetRequest.wake_time,
        mealsCount: targetRequest.meals_count,
      };

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          clientData,
          currentPlan,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error('Failed to start stream');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      setCurrentPlan(assistantContent);
    } catch (err) {
      console.error('Error sending message:', err);
      toast({ title: 'خطأ في الاتصال', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;
    sendMessage(inputMessage);
  };

  const handleApproveAndSave = async () => {
    if (!selectedRequest || !currentPlan) return;

    try {
      // Save to diet_plans or workout_plans
      if (requestType === 'diet') {
        const dietReq = selectedRequest as DietRequest;
        await supabase.from('diet_plans').insert({
          diet_request_id: dietReq.id,
          client_name: dietReq.name,
          client_phone: dietReq.phone,
          client_data: {
            weight: dietReq.weight,
            height: dietReq.height,
            age: dietReq.age,
            gender: dietReq.gender,
            activity_level: dietReq.activity_level,
            goal: dietReq.goal,
          },
          plan_content: currentPlan,
          status: 'approved',
        });

        // Save conversation
        const planRes = await supabase.from('diet_plans').select('id').order('created_at', { ascending: false }).limit(1);
        if (planRes.data?.[0]) {
          const planId = planRes.data[0].id;
          for (const msg of messages) {
            await supabase.from('diet_plan_messages').insert({
              diet_plan_id: planId,
              role: msg.role,
              content: msg.content,
            });
          }
        }

        // Update request status
        await supabase.from('diet_requests').update({ 
          status: 'responded', 
          admin_response: currentPlan 
        }).eq('id', dietReq.id);
      } else {
        const workoutReq = selectedRequest as WorkoutRequest;
        await supabase.from('workout_plans').insert({
          workout_request_id: workoutReq.id,
          client_name: workoutReq.name,
          client_phone: workoutReq.phone,
          client_data: {
            weight: workoutReq.weight,
            goal: workoutReq.goal,
            training_level: workoutReq.training_level,
            training_location: workoutReq.training_location,
            training_days: workoutReq.training_days,
            session_duration: workoutReq.session_duration,
          },
          plan_content: currentPlan,
          status: 'approved',
        });

        await supabase.from('workout_requests').update({ 
          status: 'responded', 
          admin_response: currentPlan 
        }).eq('id', workoutReq.id);
      }

      toast({ title: 'تم حفظ واعتماد النظام بنجاح ✓' });
    } catch (err) {
      console.error('Error saving plan:', err);
      toast({ title: 'خطأ في الحفظ', variant: 'destructive' });
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedRequest || !currentPlan) return;

    const planType = requestType === 'diet' ? 'الغذائي' : 'التمرين';
    const message = `مرحباً ${selectedRequest.name}! 🏋️‍♂️

هذا هو نظامك ${planType} المخصص:

${currentPlan}

2B GYM - نحو جسم أفضل 💪`;

    const whatsappLink = buildWhatsAppLink(selectedRequest.phone);
    if (whatsappLink) {
      window.open(`${whatsappLink}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentPlan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    setSelectedRequest(null);
    setMessages([]);
    setCurrentPlan('');
  };

  const renderRequestsList = () => (
    <div className="space-y-4 p-4">
      {activeTab === 'diet' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Salad className="w-5 h-5 text-primary" />
            <h3 className="font-bold">طلبات الأنظمة الغذائية</h3>
            {dietRequests.length > 0 && (
              <Badge variant="secondary">{dietRequests.length}</Badge>
            )}
          </div>
          
          {dietRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Salad className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات في الانتظار</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dietRequests.map((req) => (
                <Card 
                  key={req.id} 
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectDietRequest(req)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{req.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {goalLabels[req.goal]} • {req.weight}كجم • {req.age} سنة
                      </p>
                    </div>
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'workout' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold">طلبات أنظمة التمرين</h3>
            {workoutRequests.length > 0 && (
              <Badge variant="secondary">{workoutRequests.length}</Badge>
            )}
          </div>
          
          {workoutRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات في الانتظار</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workoutRequests.map((req) => (
                <Card 
                  key={req.id} 
                  className="p-4 cursor-pointer hover:border-orange-500 transition-colors"
                  onClick={() => handleSelectWorkoutRequest(req)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{req.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {goalLabels[req.goal]} • {req.training_days} أيام/أسبوع
                      </p>
                    </div>
                    <Sparkles className="w-5 h-5 text-orange-500" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-bold">سجل الأنظمة السابقة</h3>
          </div>
          
          {savedPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد أنظمة محفوظة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPlans.map((plan) => (
                <Card key={plan.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{plan.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(plan.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <Badge variant={plan.status === 'sent' ? 'default' : 'secondary'}>
                      {plan.status === 'sent' ? 'مرسل' : 'معتمد'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderChatInterface = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <X className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <p className="font-medium">{selectedRequest?.name}</p>
          <p className="text-sm text-muted-foreground">
            {requestType === 'diet' ? 'نظام غذائي' : 'نظام تمرين'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Actions */}
      {currentPlan && (
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleApproveAndSave}>
              <Check className="w-4 h-4 ml-2" />
              موافقة وحفظ
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleSendWhatsApp}>
              <Phone className="w-4 h-4 ml-2" />
              واتساب
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      {requestType === 'diet' && (
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="اكتب تعديلاتك... (مثال: بدل التونة بالبيض)"
              className="flex-1"
              dir="rtl"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {['اختصر الوجبات', 'زود الكارب', 'بدل اللحم بالفراخ', 'شيل الألبان'].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setInputMessage(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 flex flex-col h-full">
        {selectedRequest ? (
          renderChatInterface()
        ) : (
          <>
            <SheetHeader className="p-4 border-b border-border shrink-0">
              <SheetTitle className="flex items-center gap-2 text-right">
                <Sparkles className="w-5 h-5 text-primary" />
                مساعد الأنظمة الذكي
              </SheetTitle>
            </SheetHeader>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 mx-4 mt-4 shrink-0">
                <TabsTrigger value="diet" className="relative">
                  <Salad className="w-4 h-4 ml-1" />
                  غذائي
                  {dietRequests.length > 0 && (
                    <Badge variant="secondary" className="mr-1 h-4 min-w-4 text-[10px]">
                      {dietRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="workout" className="relative">
                  <Dumbbell className="w-4 h-4 ml-1" />
                  تمرين
                  {workoutRequests.length > 0 && (
                    <Badge variant="secondary" className="mr-1 h-4 min-w-4 text-[10px]">
                      {workoutRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="w-4 h-4 ml-1" />
                  السجل
                </TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1">
                {renderRequestsList()}
              </ScrollArea>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
