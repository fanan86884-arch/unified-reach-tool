import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkoutRequestData {
  name: string;
  weight: number;
  goal: string;
  trainingLevel: string;
  trainingLocation: string;
  trainingDays: number;
  sessionDuration: number;
}

const goalLabels: Record<string, string> = {
  weight_loss: 'خسارة الوزن',
  muscle_gain: 'زيادة الكتلة العضلية',
  strength: 'زيادة القوة',
  fitness: 'لياقة عامة',
  flexibility: 'مرونة',
};

const levelLabels: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};

const locationLabels: Record<string, string> = {
  gym: 'الجيم',
  home: 'المنزل',
  outdoor: 'في الخارج',
};

async function getTrainingExamples(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('ai_training_examples')
      .select('title, plan_content')
      .eq('type', 'workout')
      .eq('is_active', true)
      .limit(3);

    if (error || !data || data.length === 0) return '';

    let examples = '\n\n📚 أمثلة من برامج تمرين سابقة للاسترشاد بها:\n';
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
    const { workoutRequest }: { workoutRequest: WorkoutRequestData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch training examples
    const trainingExamples = await getTrainingExamples(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const systemPrompt = `أنت مدرب لياقة بدنية محترف. مهمتك إنشاء برنامج تمرين أسبوعي مفصل ومخصص للعميل.
${trainingExamples}

قواعد مهمة:
1. اكتب بالعربية فقط
2. صمم التمارين حسب مكان التمرين (جيم/منزل/خارج)
3. راعِ مستوى المتدرب (مبتدئ/متوسط/متقدم)
4. وزع التمارين على الأيام المطلوبة
5. اذكر عدد المجموعات والتكرارات لكل تمرين
6. أضف فترات الراحة المناسبة
7. اختم بنصائح للإحماء والتبريد
8. استخدم نفس الأسلوب والتنسيق الموجود في الأمثلة السابقة إذا وُجدت`;

    const userPrompt = `أنشئ برنامج تمرين أسبوعي مفصل للعميل التالي:

الاسم: ${workoutRequest.name}
الوزن: ${workoutRequest.weight} كجم
الهدف: ${goalLabels[workoutRequest.goal] || workoutRequest.goal}
مستوى التدريب: ${levelLabels[workoutRequest.trainingLevel] || workoutRequest.trainingLevel}
مكان التمرين: ${locationLabels[workoutRequest.trainingLocation] || workoutRequest.trainingLocation}
عدد أيام التمرين: ${workoutRequest.trainingDays} أيام أسبوعياً
مدة الحصة: ${workoutRequest.sessionDuration} دقيقة

أرجو تقديم:
1. جدول التمارين لكل يوم
2. تفاصيل كل تمرين (المجموعات × التكرارات)
3. فترات الراحة بين المجموعات
4. نصائح للإحماء والتبريد
5. نصائح إضافية للنجاح`;

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
          { role: "user", content: userPrompt },
        ],
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

    const data = await response.json();
    const workoutPlan = data.choices?.[0]?.message?.content || "لم يتم إنشاء البرنامج";

    return new Response(JSON.stringify({ workoutPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-workout error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
