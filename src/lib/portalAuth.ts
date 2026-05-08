import { supabase } from "@/integrations/supabase/client.runtime";
import { normalizeEgyptPhoneDigits } from "@/lib/phone";

export const clientEmailFromPhone = (phone: string) => {
  const norm = normalizeEgyptPhoneDigits(phone);
  if (!norm) return null;
  return `${norm}@client.gym`;
};

export const captainEmailFromLoginId = (loginId: string) => {
  const cleaned = loginId.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "");
  const enc = encodeURIComponent(cleaned).replace(/%/g, "").toLowerCase();
  const slug = enc.slice(0, 32) || "captain";
  return `${slug}@captain.gym`;
};

export const signInClient = async (phone: string, password: string) => {
  const email = clientEmailFromPhone(phone);
  if (!email) return { error: { message: "رقم الموبايل غير صحيح" } as any };
  return supabase.auth.signInWithPassword({ email, password });
};

export const signInCaptain = async (loginId: string, password: string) => {
  const email = captainEmailFromLoginId(loginId);
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOutPortal = async () => {
  await supabase.auth.signOut();
};
