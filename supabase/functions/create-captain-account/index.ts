import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const slugify = (s: string) => {
  // Convert Arabic captain name to a stable slug (transliterate-ish via base64 short hash + arabic stripped)
  const cleaned = s.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "");
  // Use encodeURIComponent then strip percent signs to keep ascii-ish. Fall back to hash.
  const enc = encodeURIComponent(cleaned).replace(/%/g, "").toLowerCase();
  return enc.slice(0, 32) || "captain";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(url, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { captain_name, login_id, password } = await req.json();
    if (!captain_name || !login_id || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "captain_name, login_id, password (min 6) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const slug = slugify(login_id);
    const email = `${slug}@captain.gym`;

    const { data: existing } = await admin.from("captain_accounts").select("id, user_id").eq("captain_name", captain_name).maybeSingle();
    if (existing?.user_id) {
      const { error: upErr } = await admin.auth.admin.updateUserById(existing.user_id, { password });
      if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, login_id: slug, updated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "captain", captain_name },
    });
    if (createErr || !created.user) return new Response(JSON.stringify({ error: createErr?.message ?? "Create failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error: linkErr } = await admin.from("captain_accounts").insert({
      user_id: created.user.id,
      captain_name,
    });
    if (linkErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: linkErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, login_id: slug, created: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
