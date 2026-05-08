import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARABIC = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
const normPhone = (s: string) => {
  let out = s;
  ARABIC.forEach((d, i) => (out = out.replace(new RegExp(d, "g"), String(i))));
  let digits = out.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (!digits.startsWith("0") && digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;
  return digits;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(url, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { subscriber_id, password } = await req.json();
    if (!subscriber_id || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "subscriber_id and password (min 6) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: sub, error: subErr } = await admin.from("subscribers").select("id, phone, name").eq("id", subscriber_id).maybeSingle();
    if (subErr || !sub) return new Response(JSON.stringify({ error: "Subscriber not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const phone = normPhone(sub.phone);
    if (!phone) return new Response(JSON.stringify({ error: "Invalid subscriber phone" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const email = `${phone}@client.gym`;

    // Check if account already exists for this subscriber
    const { data: existing } = await admin.from("client_accounts").select("id, user_id").eq("subscriber_id", subscriber_id).maybeSingle();

    if (existing?.user_id) {
      // Just update password
      const { error: upErr } = await admin.auth.admin.updateUserById(existing.user_id, { password });
      if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, email, phone, updated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create new auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "client", subscriber_id, name: sub.name },
    });
    if (createErr || !created.user) return new Response(JSON.stringify({ error: createErr?.message ?? "Create failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error: linkErr } = await admin.from("client_accounts").insert({
      user_id: created.user.id,
      subscriber_id,
      phone,
    });
    if (linkErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: linkErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, email, phone, created: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
