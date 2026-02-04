import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, Send, Loader2, Salad, Dumbbell, 
  MessageSquare, Plus, Check, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface TrainingExample {
  id: string;
  type: 'diet' | 'workout';
  title: string;
  plan_content: string;
  is_active: boolean;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-chat`;

export const AITrainingChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `مرحباً! 👋 أنا مساعد تدريب الذكاء الاصطناعي.

يمكنك تدريبي على أسلوبك الخاص في كتابة الأنظمة الغذائية وبرامج التمرين.

**كيف يعمل التدريب:**
1. أرسل لي نظام غذائي أو برنامج تمرين تريد أن أتعلم منه
2. سأحلل الأسلوب والتنسيق المستخدم
3. سأحفظه كمثال للتدريب

**أوامر مفيدة:**
- "احفظ هذا كنظام غذائي" + لصق النظام
- "احفظ هذا كبرنامج تمرين" + لصق البرنامج
- "أظهر الأمثلة المحفوظة"

ابدأ بإرسال نظام تريد حفظه للتدريب! 💪`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExamples();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchExamples = async () => {
    const { data } = await supabase
      .from('ai_training_examples')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setExamples(data as TrainingExample[]);
  };

  const saveExample = async (type: 'diet' | 'workout', content: string) => {
    const title = type === 'diet' 
      ? `نظام غذائي - ${new Date().toLocaleDateString('ar-EG')}`
      : `برنامج تمرين - ${new Date().toLocaleDateString('ar-EG')}`;

    const { error } = await supabase.from('ai_training_examples').insert({
      type,
      title,
      client_data: {},
      plan_content: content,
    });

    if (error) throw error;
    
    await fetchExamples();
    return title;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check for save commands
      const lowerMsg = userMessage.toLowerCase();
      const isDietSave = lowerMsg.includes('احفظ') && (lowerMsg.includes('غذائي') || lowerMsg.includes('دايت'));
      const isWorkoutSave = lowerMsg.includes('احفظ') && (lowerMsg.includes('تمرين') || lowerMsg.includes('تمارين'));
      const isShowExamples = lowerMsg.includes('أظهر') && lowerMsg.includes('أمثلة');

      let response = '';

      if (isShowExamples) {
        // Show saved examples
        await fetchExamples();
        if (examples.length === 0) {
          response = 'لا توجد أمثلة محفوظة بعد. أرسل لي نظام غذائي أو برنامج تمرين لحفظه!';
        } else {
          response = `**الأمثلة المحفوظة (${examples.length}):**\n\n`;
          examples.forEach((ex, idx) => {
            const icon = ex.type === 'diet' ? '🥗' : '💪';
            const status = ex.is_active ? '✅' : '❌';
            response += `${idx + 1}. ${icon} ${ex.title} ${status}\n`;
          });
          response += '\n_الأمثلة المفعلة (✅) تُستخدم في التدريب_';
        }
      } else if (isDietSave || isWorkoutSave) {
        // Extract content (everything after the command)
        const content = userMessage
          .replace(/احفظ.*?(غذائي|دايت|تمرين|تمارين)/i, '')
          .trim();
        
        if (content.length < 50) {
          response = 'يبدو أن المحتوى قصير جداً. من فضلك ألصق النظام الكامل بعد أمر الحفظ.';
        } else {
          const type = isDietSave ? 'diet' : 'workout';
          const title = await saveExample(type, content);
          response = `✅ تم حفظ "${title}" بنجاح!\n\nسأستخدم هذا المثال لتعلم أسلوبك في الأنظمة المستقبلية.\n\nهل تريد إضافة مثال آخر؟`;
        }
      } else {
        // Check if the message looks like a plan (long text)
        if (userMessage.length > 200) {
          response = `يبدو أن هذا نظام ${userMessage.includes('تمرين') || userMessage.includes('سكوات') ? 'تمرين' : 'غذائي'}!

هل تريد حفظه كمثال للتدريب؟

أرسل:
- "احفظ هذا كنظام غذائي" لحفظه كمثال غذائي
- "احفظ هذا كبرنامج تمرين" لحفظه كمثال تمارين`;
        } else {
          // General conversation
          response = `شكراً على رسالتك! 

يمكنني مساعدتك في:
1. **حفظ أنظمة غذائية** - أرسل "احفظ هذا كنظام غذائي" ثم الصق النظام
2. **حفظ برامج تمرين** - أرسل "احفظ هذا كبرنامج تمرين" ثم الصق البرنامج
3. **عرض الأمثلة** - أرسل "أظهر الأمثلة المحفوظة"

كلما أضفت أمثلة أكثر، سأتعلم أسلوبك بشكل أفضل! 📚`;
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'خطأ في المعالجة', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">تدريب الذكاء الاصطناعي</h3>
          <p className="text-xs text-muted-foreground">
            {examples.filter(e => e.is_active).length} مثال مُفعّل
          </p>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 ml-1" />
          تفاعلي
        </Badge>
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

      {/* Quick actions */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInputMessage('احفظ هذا كنظام غذائي:\n')}
          >
            <Salad className="w-3 h-3 ml-1" />
            حفظ نظام غذائي
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInputMessage('احفظ هذا كبرنامج تمرين:\n')}
          >
            <Dumbbell className="w-3 h-3 ml-1" />
            حفظ برنامج تمرين
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInputMessage('أظهر الأمثلة المحفوظة')}
          >
            <MessageSquare className="w-3 h-3 ml-1" />
            عرض الأمثلة
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="اكتب رسالتك أو الصق نظام للتدريب..."
            className="flex-1"
            dir="rtl"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
