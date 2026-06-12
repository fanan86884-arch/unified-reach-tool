import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  Calendar, ScanLine, RefreshCw, MessageCircle, Salad, Dumbbell,
  AlertCircle, Bell, ChevronLeft, CreditCard, LifeBuoy, Phone,
  CheckCircle2, Clock, Wallet,
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
  const [unreadChat, setUnreadChat] = useState(0);
  const [contactPhone, setContactPhone] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!session.subscriberId) return;
    void (async () => {
      const [notifRes, chatRes, contactRes] = await Promise.all([
        supabase.from("client_notifications").select("id", { count: "exact", head: true }).eq("subscriber_id", session.subscriberId).eq("is_read", false),
        supabase.from("client_chat_messages").select("id", { count: "exact", head: true }).eq("subscriber_id", session.subscriberId).eq("sender_role", "admin").eq("is_read", false),
        supabase.from("contact_settings").select("*").maybeSingle(),
      ]);
      setUnread(notifRes.count || 0);
      setUnreadChat(chatRes.count || 0);
      const captains = (contactRes.data as any)?.captains;
      if (Array.isArray(captains)) setContactPhone(captains[0]?.phone || "");
    })();
  }, [session.subscriberId]);

  if (!sub) return null;

  const totalDays = Math.max(1, differenceInDays(parseISO(sub.end_date), parseISO(sub.start_date)));
  const daysLeft = differenceInDays(parseISO(sub.end_date), new Date());
  const usedDays = Math.max(0, totalDays - Math.max(0, daysLeft));
  const progress = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));
  const expired = daysLeft < 0;
  const expiringSoon = !expired && daysLeft <= 7;
  const totalAmount = (sub.paid_amount || 0) + (sub.remaining_amount || 0);
  const paidPct = totalAmount > 0 ? Math.round(((sub.paid_amount || 0) / totalAmount) * 100) : 100;

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

  const openSupport = () => {
    if (!contactPhone) {
      navigate("/portal/chat");
      return;
    }
    const num = contactPhone.replace(/\D/g, "").replace(/^0/, "20");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{greeting} 👋</p>
          <h1 className="text-2xl font-bold mt-1 truncate">{sub.name}</h1>
        </div>
        <button
          onClick={() => navigate("/portal/notifications")}
          className="relative p-2.5 rounded-2xl bg-card border border-border/50 active:scale-95 transition"
          aria-label="الإشعارات"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* Alert banner */}
      {(expired || expiringSoon) && (
        <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${expired ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-500"}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{expired ? "اشتراكك انتهى — جدد الآن" : `اشتراكك ينتهي خلال ${daysLeft} يوم`}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={requestRenewal} disabled={requesting}>
            تجديد
          </Button>
        </div>
      )}

      {/* Hero subscription card */}
      <Card
        className="p-5 border-0 text-primary-foreground overflow-hidden relative cursor-pointer shadow-lg"
        style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
        onClick={() => navigate("/portal/subscription")}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] opacity-80 uppercase tracking-wide">نوع الاشتراك</div>
            <div className="text-xl font-bold mt-1">{typeLabels[sub.subscription_type] || sub.subscription_type}</div>
          </div>
          <div className="flex items-center gap-1 text-xs bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
            {expired ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {expired ? "منتهي" : "نشط"}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-[11px] opacity-80">المدة المتبقية</span>
            <span className="text-2xl font-bold">{expired ? 0 : daysLeft} <span className="text-xs font-normal opacity-80">يوم</span></span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] opacity-90">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(sub.start_date), "dd/MM/yyyy")}</span>
          <ChevronLeft className="h-4 w-4 opacity-70" />
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(sub.end_date), "dd/MM/yyyy")}</span>
        </div>
      </Card>

      {/* Payment summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><Wallet className="h-4 w-4 text-primary" /></div>
            <span className="text-sm font-semibold">ملخص المدفوعات</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{paidPct}% مدفوع</span>
        </div>
        <Progress value={paidPct} className="h-1.5 mb-3" />
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-emerald-500/10">
            <div className="text-[10px] text-muted-foreground mb-0.5">المدفوع</div>
            <div className="text-base font-bold text-emerald-500">{sub.paid_amount} ج.م</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10">
            <div className="text-[10px] text-muted-foreground mb-0.5">المتبقي</div>
            <div className="text-base font-bold text-amber-500">{sub.remaining_amount} ج.م</div>
          </div>
        </div>
      </Card>

      {/* Primary action buttons */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">الوصول السريع</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <PrimaryTile icon={CreditCard} label="اشتراكي" onClick={() => navigate("/portal/subscription")} />
          <PrimaryTile icon={MessageCircle} label="رسائلي" badge={unreadChat} onClick={() => navigate("/portal/chat")} />
          <PrimaryTile icon={LifeBuoy} label="دعم" onClick={openSupport} />
        </div>
      </div>

      {/* Secondary actions */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">إجراءات</h2>
        <div className="grid grid-cols-4 gap-2">
          <ActionTile icon={ScanLine} label="حضور" onClick={() => navigate("/checkin")} />
          <ActionTile icon={RefreshCw} label="تجديد" loading={requesting} onClick={requestRenewal} />
          <ActionTile icon={Salad} label="غذائي" onClick={() => navigate("/portal/requests?tab=diet")} />
          <ActionTile icon={Dumbbell} label="تمرين" onClick={() => navigate("/portal/requests?tab=workout")} />
        </div>
      </div>

      {/* Captain card */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shrink-0">
            {sub.captain?.trim().charAt(0) || "ك"}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">الكابتن المسؤول</div>
            <div className="font-semibold truncate">{sub.captain}</div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="icon" variant="outline" onClick={() => navigate("/portal/chat")} aria-label="دردشة">
            <MessageCircle className="h-4 w-4" />
          </Button>
          {contactPhone && (
            <Button size="icon" variant="outline" onClick={openSupport} aria-label="واتساب">
              <Phone className="h-4 w-4 text-emerald-500" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

const PrimaryTile = ({ icon: Icon, label, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className="relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50 active:scale-95 transition shadow-sm hover:border-primary/40"
  >
    <div className="p-2.5 rounded-xl bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <span className="text-xs font-semibold">{label}</span>
    {badge > 0 && (
      <span className="absolute top-2 left-2 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </button>
);

const ActionTile = ({ icon: Icon, label, onClick, loading }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 active:scale-95 transition disabled:opacity-50"
  >
    <div className="p-2 rounded-xl bg-primary/10">
      <Icon className={`h-4.5 w-4.5 text-primary ${loading ? "animate-spin" : ""}`} />
    </div>
    <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
  </button>
);
