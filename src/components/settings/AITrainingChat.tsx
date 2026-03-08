import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, Send, Loader2, Salad, Dumbbell, 
  MessageSquare, Sparkles, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export const AITrainingChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `أهلاً! أنا مساعدك الذكي في 2B GYM 💪

أقدر أساعدك في:
- إنشاء أنظمة غذائية وبرامج تمرين
- الإجابة على أسئلة اللياقة والتغذية
- تعلم أسلوبك في الكتابة (ابعتلي نظام وأنا هتعلمه)

جرب تسألني أي حاجة أو ابعتلي نظام غذائي عشان أتعلم منه!`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [pendingSaveContent, setPendingSaveContent] = useState<string | null>(null);
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

  const deleteExample = async (id: string) => {
    await supabase.from('ai_training_examples').delete().eq('id', id);
    await fetchExamples();
    toast({ title: 'تم حذف المثال' });
  };

  const handleSaveTraining = async (type: 'diet' | 'workout', content: string) => {
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [],
          saveData: { type, content },
        }),
      });

      if (!resp.ok) throw new Error('Save failed');
      
      await fetchExamples();
      setPendingSaveContent(null);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `تمام! حفظت ${type === 'diet' ? 'النظام الغذائي' : 'برنامج التمرين'} في ذاكرتي ✅\nهستخدمه كمرجع في الأنظمة اللي هنشئها بعد كده.\n\nعايز تضيف مثال تاني؟`
      }]);
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: 'خطأ في الحفظ', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    const userMsg: Message = { role: 'user', content: userMessage };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInputMessage('');
    setIsLoading(true);

    // Check for save commands client-side
    const lowerMsg = userMessage.toLowerCase();
    const isDietSave = (lowerMsg.includes('احفظ') || lowerMsg.includes('حفظ')) && (lowerMsg.includes('غذائي') || lowerMsg.includes('دايت'));
    const isWorkoutSave = (lowerMsg.includes('احفظ') || lowerMsg.includes('حفظ')) && (lowerMsg.includes('تمرين') || lowerMsg.includes('تمارين'));

    if (isDietSave && pendingSaveContent) {
      await handleSaveTraining('diet', pendingSaveContent);
      setIsLoading(false);
      return;
    }
    if (isWorkoutSave && pendingSaveContent) {
      await handleSaveTraining('workout', pendingSaveContent);
      setIsLoading(false);
      return;
    }

    // If long text, store as potential training content
    if (userMessage.length > 200) {
      setPendingSaveContent(userMessage);
    }

    // Stream AI response
    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          mode: 'training',
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل الاتصال');
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
                if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user') {
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

      // Check if AI response contains save commands
      if (assistantContent.includes('[SAVE_DIET]')) {
        const content = assistantContent.replace('[SAVE_DIET]', '').trim();
        if (content.length > 50) {
          await handleSaveTraining('diet', pendingSaveContent || content);
        }
      } else if (assistantContent.includes('[SAVE_WORKOUT]')) {
        const content = assistantContent.replace('[SAVE_WORKOUT]', '').trim();
        if (content.length > 50) {
          await handleSaveTraining('workout', pendingSaveContent || content);
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = err instanceof Error ? err.message : 'خطأ في الاتصال';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errorMsg}` }]);
      toast({ title: errorMsg, variant: 'destructive' });
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
          <h3 className="font-bold">المساعد الذكي</h3>
          <p className="text-xs text-muted-foreground">
            {examples.filter(e => e.is_active).length} مثال في الذاكرة
          </p>
        </div>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 ml-1" />
          ذكي
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
          
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-end">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Saved examples preview */}
      {examples.length > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {examples.slice(0, 5).map((ex) => (
              <Badge
                key={ex.id}
                variant="outline"
                className="shrink-0 text-[10px] gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => deleteExample(ex.id)}
              >
                {ex.type === 'diet' ? <Salad className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />}
                {ex.title.slice(0, 20)}
                <Trash2 className="w-2.5 h-2.5 text-destructive" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInputMessage('ايه اللي اتعلمته لحد دلوقتي؟')}
          >
            <Brain className="w-3 h-3 ml-1" />
            ما تعلمته
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInputMessage('اعملي نظام غذائي لشخص وزنه 80 كجم عايز يخس')}
          >
            <Salad className="w-3 h-3 ml-1" />
            جرب نظام غذائي
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInputMessage('اعملي برنامج تمرين 4 أيام في الأسبوع')}
          >
            <Dumbbell className="w-3 h-3 ml-1" />
            جرب برنامج تمرين
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="اسأل أي حاجة أو ابعت نظام للتدريب..."
            className="flex-1"
            dir="rtl"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
};
