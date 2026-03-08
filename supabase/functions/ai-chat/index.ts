import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

async function getTrainingMemory(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('ai_training_examples')
      .select('type, title, plan_content, client_data')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return '';

    let memory = '\n\n=== ذاكرة التدريب (أمثلة تعلمتها سابقاً) ===\n';
    const dietExamples = data.filter((e: any) => e.type === 'diet');
    const workoutExamples = data.filter((e: any) => e.type === 'workout');

    if (dietExamples.length > 0) {
      memory += '\n--- أنظمة غذائية تعلمتها ---\n';
      dietExamples.forEach((ex: any, i: number) => {
        memory += `\nمثال ${i + 1}: ${ex.title}\n${ex.plan_content.slice(0, 2000)}\n`;
      });
    }

    if (workoutExamples.length > 0) {
      memory += '\n--- برامج تمرين تعلمتها ---\n';
      workoutExamples.forEach((ex: any, i: number) => {
        memory += `\nمثال ${i + 1}: ${ex.title}\n${ex.plan_content.slice(0, 2000)}\n`;
      });
    }

    memory += '\n=== نهاية ذاكرة التدريب ===\n';
    memory += 'استخدم هذه الأمثلة كمرجع لأسلوبك في الكتابة. إذا طلب المستخدم حفظ مثال جديد، أخبره أنك تعلمته وسيُستخدم في المستقبل.\n';

    return memory;
  } catch (e) {
    console.error('Error fetching training memory:', e);
    return '';
  }
}

async function saveTrainingExample(
  supabaseUrl: string, 
  supabaseKey: string, 
  type: 'diet' | 'workout', 
  content: string
): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
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
    return title;
  } catch (e) {
    console.error('Error saving training example:', e);
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, saveData }: {
      messages: Message[];
      mode?: 'training' | 'general';
      saveData?: { type: 'diet' | 'workout'; content: string };
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // If saving training data
    if (saveData) {
      const title = await saveTrainingExample(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, saveData.type, saveData.content);
      return new Response(JSON.stringify({ saved: true, title }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load training memory
    const trainingMemory = await getTrainingMemory(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const systemPrompt = `أنت مساعد ذكي متخصص في اللياقة البدنية والتغذية الرياضية لصالة "2B GYM". أنت تتحدث بالعربية المصرية بأسلوب ودود ومحترف.

قدراتك:
1. إنشاء أنظمة غذائية وبرامج تمرين مخصصة
2. الإجابة على أسئلة اللياقة والتغذية
3. تعلم أساليب جديدة في كتابة الأنظمة من الأمثلة المُقدمة
4. تذكر كل ما تعلمته واستخدامه في ردودك المستقبلية

${mode === 'training' ? `
أنت الآن في وضع التدريب. يمكن للمستخدم:
- إرسال أنظمة غذائية أو برامج تمرين لتتعلم منها
- سؤالك عن ما تعلمته
- طلب تطبيق ما تعلمته على حالات جديدة

عندما يرسل المستخدم نظام غذائي أو برنامج تمرين طويل (أكثر من 100 حرف):
1. حلل الأسلوب والتنسيق المستخدم
2. أخبره بما لاحظته عن الأسلوب
3. اسأله إذا كان يريد حفظه كمثال للتدريب
4. إذا وافق أو طلب الحفظ، رد بـ: [SAVE_DIET] أو [SAVE_WORKOUT] متبوعاً بالمحتوى

عندما يسأل "ما الذي تعلمته" أو "أظهر الأمثلة":
- لخص الأمثلة المحفوظة في ذاكرتك
- اذكر الأنماط والأساليب التي تعلمتها
` : ''}

${trainingMemory}

قواعد مهمة:
1. تحدث بالعربية دائماً
2. كن موجزاً وعملياً
3. استخدم الأمثلة المحفوظة كمرجع لأسلوبك
4. لا تستخدم علامات Markdown مثل ** أو ## 
5. استخدم تنسيق بسيط بالأرقام والشرطات فقط`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول بعد دقيقة" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "خطأ في خدمة AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
