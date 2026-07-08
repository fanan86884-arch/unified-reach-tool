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
      targetCalories = tdee - 500;
    } else if (dietRequest.goal === 'muscle_gain') {
      targetCalories = tdee + 300;
    }

    const targetProtein = Math.round(dietRequest.weight * (dietRequest.goal === 'muscle_gain' ? 2 : 1.6));
    const roundedCalories = Math.round(targetCalories);

    const systemPrompt = `أنت خبير تغذية رياضية. مهمتك إنشاء نظام غذائي يومي دقيق ومحسوب بعناية.

قواعد صارمة يجب الالتزام بها حرفياً:
1. اكتب بالعربية فقط، بدون إيموجي أو رموز تعبيرية
2. عدد الوجبات = ${dietRequest.mealsCount} بالضبط. لا تضف وجبات إضافية ولا سناكات غير مطلوبة.
3. إجمالي السعرات اليومي يجب أن يكون بين ${roundedCalories - 30} و ${roundedCalories + 30} سعرة (هامش ±30 فقط).
4. إجمالي البروتين اليومي = ${targetProtein} جرام تقريباً (±10 جرام).
5. لكل مكون في الوجبة اذكر: اسم الطعام + الكمية بالجرام + السعرات + البروتين بين قوسين.
6. في نهاية كل وجبة اذكر: "إجمالي الوجبة: X سعرة | Y جم بروتين".
7. في نهاية النظام اذكر قسم "الإجمالي اليومي":
   - السعرات: X
   - البروتين: X جم
   - الكارب: X جم
   - الدهون: X جم
8. استخدم أطعمة مصرية متوفرة وبأسعار معقولة.
9. لا تضاعف الكميات. حافظ على حصص واقعية (مثال: صدر فرخة 150جم، أرز مطبوخ 100جم).
10. لا تكتب مقدمات أو ترحيب أو نصائح طويلة. مباشرة النظام.

معلومات الحساب:
- الوزن: ${dietRequest.weight} كجم
- الهدف: ${goalLabels[dietRequest.goal] || dietRequest.goal}
- السعرات المستهدفة: ${roundedCalories} سعرة/يوم
- البروتين المطلوب: ${targetProtein} جرام/يوم`;

    const userPrompt = `أنشئ نظام غذائي يومي للعميل:

الاسم: ${dietRequest.name}
الوزن: ${dietRequest.weight} كجم | الطول: ${dietRequest.height} سم | العمر: ${dietRequest.age} سنة
النوع: ${genderLabels[dietRequest.gender] || dietRequest.gender}
مستوى النشاط: ${activityLabels[dietRequest.activityLevel] || dietRequest.activityLevel}
الهدف: ${goalLabels[dietRequest.goal] || dietRequest.goal}
موعد الاستيقاظ: ${dietRequest.wakeTime} | موعد النوم: ${dietRequest.sleepTime}
عدد الوجبات: ${dietRequest.mealsCount}

وزع الوجبات بتوقيتات مناسبة بين الاستيقاظ والنوم. تأكد من مطابقة السعرات والبروتين للمستهدف.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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

    return new Response(JSON.stringify({ dietPlan, targetCalories: roundedCalories }), {
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
