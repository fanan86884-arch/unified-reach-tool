import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

type State = "scanning" | "checking" | "success" | "error";

export default function CheckIn() {
  const session = usePortalSession("client");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [state, setState] = useState<State>("scanning");
  const [message, setMessage] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    if (session.loading) return;
    if (!session.userId) {
      navigate(`/portal/login?next=${encodeURIComponent("/checkin" + window.location.search)}`);
      return;
    }
    // If token is in URL (scanned outside app), process immediately
    const token = params.get("token");
    if (token && !handledRef.current) {
      handledRef.current = true;
      void processToken(token);
    }
  }, [session.loading, session.userId]);

  const processToken = async (token: string) => {
    setState("checking");
    if (!session.subscriberId || !session.userId) {
      setState("error"); setMessage("حسابك غير مكتمل"); return;
    }
    const { data: tk } = await supabase.from("gym_qr_tokens").select("token, is_active").eq("token", token).maybeSingle();
    if (!tk || !tk.is_active) {
      setState("error"); setMessage("رمز QR غير صحيح أو غير مفعل"); return;
    }
    // Prevent duplicate within last 30 minutes
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("attendance")
      .select("id")
      .eq("subscriber_id", session.subscriberId)
      .gte("checked_in_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      setState("success"); setMessage("تم تسجيل حضورك بالفعل"); return;
    }
    const { error } = await supabase.from("attendance").insert({
      subscriber_id: session.subscriberId,
      client_user_id: session.userId,
      qr_token: token,
    });
    if (error) { setState("error"); setMessage(error.message); return; }
    setState("success"); setMessage("تم تسجيل حضورك بنجاح");
  };

  const handleScan = (results: any[]) => {
    if (handledRef.current || !results?.length) return;
    const raw = results[0]?.rawValue || "";
    let token = raw;
    // Allow URL-style QR
    try {
      if (raw.includes("token=")) {
        const u = new URL(raw, window.location.origin);
        token = u.searchParams.get("token") || raw;
      }
    } catch {}
    if (!token) return;
    handledRef.current = true;
    void processToken(token);
  };

  if (session.loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col" dir="rtl" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <div className="max-w-md mx-auto w-full space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/portal")} className="gap-1">
          <ArrowRight className="h-4 w-4" /> رجوع
        </Button>

        <h1 className="text-xl font-bold text-center">تسجيل الحضور</h1>

        {state === "scanning" && (
          <Card className="overflow-hidden">
            <Scanner
              onScan={handleScan}
              constraints={{ facingMode: "environment" }}
              styles={{ container: { width: "100%" } }}
            />
            <div className="p-3 text-center text-xs text-muted-foreground">
              وجّه الكاميرا نحو رمز QR المعلق في الجيم
            </div>
          </Card>
        )}

        {state === "checking" && (
          <Card className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">جاري التحقق...</div>
          </Card>
        )}

        {state === "success" && (
          <Card className="p-8 flex flex-col items-center gap-3 border-green-500/30">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div className="font-bold">{message}</div>
            <Button onClick={() => navigate("/portal")} className="mt-2">العودة للبطاقة</Button>
          </Card>
        )}

        {state === "error" && (
          <Card className="p-8 flex flex-col items-center gap-3 border-destructive/30">
            <XCircle className="h-16 w-16 text-destructive" />
            <div className="font-bold text-destructive">{message}</div>
            <Button variant="outline" onClick={() => { handledRef.current = false; setState("scanning"); }}>إعادة المحاولة</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
