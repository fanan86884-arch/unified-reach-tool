import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  Calendar, Wallet, ScanLine, RefreshCw, MessageCircle, Salad, Dumbbell,
  AlertCircle, Bell, ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  monthly: "شهري", quarterly: "ربع سنوي", "semi-annual": "نصف سنوي", annual: "سنوي",
};

export default function PortalHome() {
  const session = usePortalSession("client");
  const { data: sub } = useClientSubscriber(session.subscriberId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unread, setUnread] = useState(0);
  const [contactPhone, setContactPhone] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!session.subscriberId) return;
    void (async () => {
      const [{ count }, contactRes] = await Promise.all([
        supabase.from("client_notifications").select("id", { count: "exact", head: true }).eq("subscriber_id", session.subscriberId).eq("is_read", false),
        supabase.from("contact_settings").select("*").maybeSingle(),
      ]);
      setUnread(count || 0);
      const captains = (contactRes.data as any)?.captains;
      if (Array.isArray(captains)) {
        setContactPhone(captains[0]?.phone || "");
      }
    })();
  }, [session.subscriberId]);

  if (!sub) return null;

  const daysLeft = differenceInDays(parseISO(sub.end_date), new Date());
  const expired = daysLeft < 0;
  const expiringSoon = !expired && daysLeft <= 7;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 18) return "مساء الخير";
    return "مساء النور";
  })();

  const requestRenewal = async () => {
    setRequesting(true);
    const { error } = await supabase.from("subscription_requests").insert({
      name: sub.name, phone: sub.phone, subscription_type: sub.subscription_type,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
      paid_amount: 0, remaining_amount: 0, status: "pending",
    });
    setRequesting(false);
    if (error) toast({ title: "فشل الطلب", description: error.message, variant: "destructive" });
    else toast({ title: "تم إرسال طلب التجديد" });
  };

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{greeting} 👋</p>
          <h1 className="text-2xl font-bold mt-1">{sub.name}</h1>
        </div>
        <button
          onClick={() => navigate("/portal/notifications")}
          className="relative p-2 rounded-full bg-card border border-border/50"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* Banner */}
      {(expired || expiringSoon) && (
        <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${expired ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-400"}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{expired ? "اشتراكك انتهى — جدد الآن" : `اشتراكك ينتهي خلال ${daysLeft} يوم`}</span>
        </div>
      )}

      {/* Hero subscription card */}
      <Card
        className="p-5 border-0 text-primary-foreground overflow-hidden relative cursor-pointer"
        style={{
          backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
        }}
        onClick={() => navigate("/portal/subscription")}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">نوع الاشتراك</div>
            <div className="text-xl font-bold mt-1">{typeLabels[sub.subscription_type] || sub.subscription_type}</div>
          </div>
          <ChevronLeft className="h-5 w-5 opacity-80" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] opacity-80">متبقي</div>
            <div className="text-2xl font-bold mt-0.5">{expired ? 0 : daysLeft}</div>
            <div className="text-[10px] opacity-80">يوم</div>
          </div>
          <div className="border-x border-white/20">
            <div className="text-[10px] opacity-80">المدفوع</div>
            <div className="text-base font-bold mt-1">{sub.paid_amount}</div>
            <div className="text-[10px] opacity-80">ج.م</div>
          </div>
          <div>
            <div className="text-[10px] opacity-80">المتبقي</div>
            <div className="text-base font-bold mt-1">{sub.remaining_amount}</div>
            <div className="text-[10px] opacity-80">ج.م</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] opacity-90">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(sub.start_date), "dd/MM/yyyy")}</span>
          <span>—</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(sub.end_date), "dd/MM/yyyy")}</span>
        </div>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">إجراءات سريعة</h2>
        <div className="grid grid-cols-4 gap-2">
          <ActionTile icon={ScanLine} label="حضور" onClick={() => navigate("/checkin")} />
          <ActionTile icon={RefreshCw} label="تجديد" loading={requesting} onClick={requestRenewal} />
          <ActionTile icon={Salad} label="نظام غذائي" onClick={() => navigate("/portal/requests?tab=diet")} />
          <ActionTile icon={Dumbbell} label="جدول تمرين" onClick={() => navigate("/portal/requests?tab=workout")} />
        </div>
      </div>

      {/* Captain card */}
      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">الكابتن المسؤول</div>
          <div className="font-semibold mt-1">{sub.captain}</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/portal/chat")}>
            <MessageCircle className="h-4 w-4 ml-1" />
            دردشة
          </Button>
          {contactPhone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const num = contactPhone.replace(/\D/g, "").replace(/^0/, "20");
                window.open(`https://wa.me/${num}`, "_blank");
              }}
            >
              <MessageCircle className="h-4 w-4 text-green-500" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

const ActionTile = ({ icon: Icon, label, onClick, loading }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 active:scale-95 transition disabled:opacity-50"
  >
    <div className="p-2 rounded-xl bg-primary/10">
      <Icon className={`h-5 w-5 text-primary ${loading ? "animate-spin" : ""}`} />
    </div>
    <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
  </button>
);
