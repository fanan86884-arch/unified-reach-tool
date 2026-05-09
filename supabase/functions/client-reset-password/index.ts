import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARABIC = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
const normPhone = (s: string) => {
  let out = s ?? "";
  ARABIC.forEach((d, i) => (out = out.replace(new RegExp(d, "g"), String(i))));
  let digits = out.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (!digits.startsWith("0") && digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;
  return digits;
};

const normName = (s: string) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { phone: rawPhone, name: rawName, password } = await req.json();
    const phone = normPhone(rawPhone ?? "");
    if (!phone || phone.length < 10) return json({ error: "رقم الموبايل غير صحيح" }, 400);
    if (!rawName || String(rawName).trim().length < 3) return json({ error: "أدخل الاسم كما هو مسجل" }, 400);
    if (!password || String(password).length < 6) return json({ error: "كلمة السر يجب 6 أحرف على الأقل" }, 400);

    // Find subscriber by phone
    const candidates = Array.from(new Set([phone, phone.replace(/^0/, ""), "+20" + phone.replace(/^0/, ""), "20" + phone.replace(/^0/, "")]));
    const { data: subs } = await admin.from("subscribers").select("id, phone, name").in("phone", candidates);
    let subscriber = subs?.[0];
    if (!subscriber) {
      const { data: all } = await admin.from("subscribers").select("id, phone, name");
      subscriber = (all ?? []).find((s) => normPhone(s.phone) === phone) as any;
    }
    if (!subscriber) return json({ error: "رقم الموبايل غير مسجل" }, 404);

    // Verify name matches (basic identity check)
    if (normName(subscriber.name) !== normName(rawName)) {
      return json({ error: "الاسم غير مطابق للمسجل في الجيم" }, 403);
    }

    // Get linked client account
    const { data: account } = await admin.from("client_accounts").select("user_id").eq("subscriber_id", subscriber.id).maybeSingle();
    if (!account) return json({ error: "لا يوجد حساب لهذا الرقم. أنشئ حساب أولاً" }, 404);

    const { error: updErr } = await admin.auth.admin.updateUserById(account.user_id, { password });
    if (updErr) return json({ error: updErr.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
