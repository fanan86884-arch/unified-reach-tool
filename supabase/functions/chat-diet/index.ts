import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ClientData {
  name: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  goal: string;
  sleepTime: string;
  wakeTime: string;
  mealsCount: number;
}

const genderLabels: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
};

const activityLabels: Record<string, string> = {
  sedentary: 'خامل (قليل الحركة)',
  moderate: 'متوسط النشاط',
  active: 'نشيط جداً',
};

const goalLabels: Record<string, string> = {
  weight_loss: 'خسارة الوزن',
  maintain: 'الحفاظ على الوزن',
  muscle_gain: 'زيادة الكتلة العضلية',
};

async function getTrainingExamples(supabaseUrl: string, supabaseKey: string, type: 'diet' | 'workout'): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('ai_training_examples')
      .select('title, plan_content')
      .eq('type', type)
      .eq('is_active', true)
      .limit(3);

    if (error || !data || data.length === 0) return '';

    let examples = '\n\n📚 أمثلة من أنظمة سابقة للاسترشاد بها:\n';
    data.forEach((example: { title: string; plan_content: string }, i: number) => {
      examples += `\n--- مثال ${i + 1}: ${example.title} ---\n${example.plan_content.slice(0, 1500)}...\n`;
    });
    
    return examples;
  } catch (e) {
    console.error('Error fetching training examples:', e);
    return '';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, clientData, currentPlan }: { 
      messages: Message[]; 
      clientData: ClientData;
      currentPlan?: string;
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch training examples
    const trainingExamples = await getTrainingExamples(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, 'diet');

    // Calculate BMR and daily calorie needs
    const bmr = clientData.gender === 'male'
      ? 88.362 + (13.397 * clientData.weight) + (4.799 * clientData.height) - (5.677 * clientData.age)
      : 447.593 + (9.247 * clientData.weight) + (3.098 * clientData.height) - (4.330 * clientData.age);

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      moderate: 1.55,
      active: 1.9,
    };

    const tdee = bmr * (activityMultipliers[clientData.activityLevel] || 1.55);
    
    let targetCalories = tdee;
    if (clientData.goal === 'weight_loss') {
      targetCalories = tdee - 500;
    } else if (clientData.goal === 'muscle_gain') {
      targetCalories = tdee + 300;
    }

    const systemPrompt = `أنت خبير تغذية رياضية متخصص في صحة اللياقة البدنية. أنت تعمل كمساعد تفاعلي لتعديل وتحسين الأنظمة الغذائية.

معلومات العميل:
- الاسم: ${clientData.name}
- الوزن: ${clientData.weight} كجم
- الطول: ${clientData.height} سم
- العمر: ${clientData.age} سنة
- النوع: ${genderLabels[clientData.gender] || clientData.gender}
- مستوى النشاط: ${activityLabels[clientData.activityLevel] || clientData.activityLevel}
- الهدف: ${goalLabels[clientData.goal] || clientData.goal}
- موعد النوم: ${clientData.sleepTime}
- موعد الاستيقاظ: ${clientData.wakeTime}
- عدد الوجبات: ${clientData.mealsCount}
- السعرات المستهدفة: ${Math.round(targetCalories)} سعرة حرارية
- البروتين المطلوب: ${Math.round(clientData.weight * (clientData.goal === 'muscle_gain' ? 2 : 1.6))} جرام

${currentPlan ? `النظام الغذائي الحالي:\n${currentPlan}\n` : ''}
${trainingExamples}

قواعد مهمة:
1. اكتب بالعربية فقط
2. استخدم أطعمة متوفرة في مصر وبأسعار معقولة
3. عند طلب تعديل، قم بتعديل النظام بالكامل وأعد كتابته
4. اذكر الكميات بالجرام أو بالملاعق/الأكواب
5. اذكر السعرات الحرارية لكل وجبة
6. كن مختصراً ومباشراً في الردود
7. إذا طُلب منك تعديل معين (مثل "بدل التونة بالبيض")، قم بالتعديل مباشرة
8. استخدم نفس الأسلوب والتنسيق الموجود في الأمثلة السابقة إذا وُجدت`;

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
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لحسابك" }), {
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
    console.error("chat-diet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
