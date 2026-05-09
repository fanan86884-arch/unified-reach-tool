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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { phone: rawPhone, password } = await req.json();
    const phone = normPhone(rawPhone ?? "");
    if (!phone || phone.length < 10) return json({ error: "رقم الموبايل غير صحيح" }, 400);
    if (!password || String(password).length < 6) return json({ error: "كلمة السر يجب 6 أحرف على الأقل" }, 400);

    // Match subscriber by phone (try multiple normalizations)
    const candidates = Array.from(new Set([phone, phone.replace(/^0/, ""), "+20" + phone.replace(/^0/, ""), "20" + phone.replace(/^0/, "")]));
    const { data: subs } = await admin.from("subscribers").select("id, phone, name").in("phone", candidates);
    let subscriber = subs?.[0];
    if (!subscriber) {
      // Fallback: scan and normalize
      const { data: all } = await admin.from("subscribers").select("id, phone, name");
      subscriber = (all ?? []).find((s) => normPhone(s.phone) === phone) as any;
    }
    if (!subscriber) return json({ error: "رقم الموبايل ده مش مسجل في الجيم. تواصل مع الإدارة" }, 404);

    // Check if account already exists
    const { data: existing } = await admin.from("client_accounts").select("id").eq("subscriber_id", subscriber.id).maybeSingle();
    if (existing) return json({ error: "الحساب موجود بالفعل، سجل دخول" }, 409);

    const email = `${phone}@client.gym`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "client", subscriber_id: subscriber.id, name: subscriber.name },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "تعذر إنشاء الحساب" }, 400);

    const { error: linkErr } = await admin.from("client_accounts").insert({
      user_id: created.user.id,
      subscriber_id: subscriber.id,
      phone,
    });
    if (linkErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: linkErr.message }, 400);
    }

    return json({ ok: true, email, phone });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
