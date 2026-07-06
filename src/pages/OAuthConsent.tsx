import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuthClient = { name?: string; logo_uri?: string; client_uri?: string };

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string; client?: AuthClient } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};

function oauth(): OAuthNamespace {
  // The supabase.auth.oauth namespace is beta and not present in current types.
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

function isSameOriginPath(p: string | null): p is string {
  if (!p) return false;
  return p.startsWith("/") && !p.startsWith("//");
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<{ client?: AuthClient } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/welcome?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("لم يرجع الخادم رابط إعادة توجيه.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-bold">تعذر تحميل طلب الربط</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }
  const clientName = details.client?.name ?? "تطبيق خارجي";
  return (
    <main className="min-h-screen flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full space-y-6 bg-card p-6 rounded-2xl border">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">ربط {clientName} بحسابك</h1>
          <p className="text-sm text-muted-foreground">
            سيتمكن {clientName} من قراءة بيانات اشتراكك وإشعاراتك، ونيابةً عنك استخدام أدوات التطبيق المصرّح بها.
          </p>
        </div>
        <div className="flex gap-2">
          <Button disabled={busy} className="flex-1" onClick={() => decide(true)}>
            موافق
          </Button>
          <Button disabled={busy} variant="outline" className="flex-1" onClick={() => decide(false)}>
            رفض
          </Button>
        </div>
      </div>
    </main>
  );
}
