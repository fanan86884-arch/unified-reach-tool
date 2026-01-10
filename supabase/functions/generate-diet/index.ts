import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DietRequestData {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dietRequest }: { dietRequest: DietRequestData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate BMR and daily calorie needs
    const bmr = dietRequest.gender === 'male'
      ? 88.362 + (13.397 * dietRequest.weight) + (4.799 * dietRequest.height) - (5.677 * dietRequest.age)
      : 447.593 + (9.247 * dietRequest.weight) + (3.098 * dietRequest.height) - (4.330 * dietRequest.age);

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      moderate: 1.55,
      active: 1.9,
    };

    const tdee = bmr * (activityMultipliers[dietRequest.activityLevel] || 1.55);
    
    let targetCalories = tdee;
    if (dietRequest.goal === 'weight_loss') {
      targetCalories = tdee - 500; // 500 calorie deficit
    } else if (dietRequest.goal === 'muscle_gain') {
      targetCalories = tdee + 300; // 300 calorie surplus
    }

    const systemPrompt = `أنت خبير تغذية رياضية متخصص في صحة اللياقة البدنية. مهمتك إنشاء نظام غذائي يومي مفصل ومخصص للعميل.

قواعد مهمة:
1. اكتب بالعربية فقط
2. استخدم أطعمة متوفرة في مصر وبأسعار معقولة
3. قسّم النظام حسب عدد الوجبات المطلوب
4. اذكر الكميات بالجرام أو بالملاعق/الأكواب
5. اذكر السعرات الحرارية لكل وجبة
6. أضف نصائح للترطيب والمكملات إذا لزم
7. اجعل الأطباق متنوعة وشهية

السعرات المستهدفة: ${Math.round(targetCalories)} سعرة حرارية يومياً
البروتين المطلوب: ${Math.round(dietRequest.weight * (dietRequest.goal === 'muscle_gain' ? 2 : 1.6))} جرام يومياً`;

    const userPrompt = `أنشئ نظام غذائي يومي مفصل للعميل التالي:

الاسم: ${dietRequest.name}
الوزن: ${dietRequest.weight} كجم
الطول: ${dietRequest.height} سم
العمر: ${dietRequest.age} سنة
النوع: ${genderLabels[dietRequest.gender] || dietRequest.gender}
مستوى النشاط: ${activityLabels[dietRequest.activityLevel] || dietRequest.activityLevel}
الهدف: ${goalLabels[dietRequest.goal] || dietRequest.goal}
موعد النوم: ${dietRequest.sleepTime}
موعد الاستيقاظ: ${dietRequest.wakeTime}
عدد الوجبات المطلوب: ${dietRequest.mealsCount} وجبات

أرجو تقديم:
1. جدول الوجبات مع التوقيتات المناسبة بناءً على مواعيد النوم والاستيقاظ
2. تفاصيل كل وجبة مع الكميات الدقيقة
3. إجمالي السعرات والبروتين لكل وجبة
4. نصائح إضافية للنجاح`;

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
    const dietPlan = data.choices?.[0]?.message?.content || "لم يتم إنشاء النظام الغذائي";

    return new Response(JSON.stringify({ dietPlan, targetCalories: Math.round(targetCalories) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-diet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
