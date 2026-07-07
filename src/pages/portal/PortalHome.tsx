import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  Calendar, RefreshCw, MessageCircle, Salad, Dumbbell,
  AlertCircle, Bell, CreditCard, LifeBuoy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  monthly: "شهري", "bi-monthly": "شهرين", quarterly: "ربع سنوي", "semi-annual": "نصف سنوي", annual: "سنوي",
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
    <div className="space-y-6 pb-6">
      {/* Greeting */}
      <div className="flex items-start justify-between pt-1">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold mt-0.5 truncate">{sub.name}</h1>
        </div>
        <button
          onClick={() => navigate("/portal/notifications")}
          className="relative p-2 active:scale-90 transition"
          aria-label="الإشعارات"
        >
          <Bell className="h-6 w-6 text-foreground" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* Alert banner */}
      {(expired || expiringSoon) && (
        <div className={`flex items-center gap-2 rounded-2xl p-3 text-sm ${expired ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"}`}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{expired ? "اشتراكك انتهى — جدد الآن" : `اشتراكك ينتهي خلال ${daysLeft} يوم`}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-transparent" onClick={requestRenewal} disabled={requesting}>
            تجديد
          </Button>
        </div>
      )}

      {/* Hero subscription card */}
      <div
        className="rounded-3xl p-6 text-primary-foreground relative cursor-pointer overflow-hidden"
        style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
        onClick={() => navigate("/portal/subscription")}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[11px] opacity-75">نوع الاشتراك</div>
            <div className="text-lg font-bold mt-0.5">{typeLabels[sub.subscription_type] || sub.subscription_type}</div>
          </div>
          <span className="text-[10px] opacity-90 font-medium">
            {expired ? "منتهي" : "نشط"}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-5xl font-bold leading-none">{expired ? 0 : daysLeft}</span>
          <span className="text-xs opacity-80">يوم متبقي</span>
        </div>
        <div className="h-1 bg-primary-foreground/20 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-primary-foreground/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] opacity-85">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(sub.start_date), "dd/MM/yyyy")}</span>
          <span className="flex items-center gap-1">{format(parseISO(sub.end_date), "dd/MM/yyyy")}</span>
        </div>
      </div>

      {/* Payment summary — inline, no card frame */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold text-muted-foreground">المدفوعات</span>
          <span className="text-[11px] text-muted-foreground">{paidPct}%</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground">مدفوع</div>
            <div className="text-lg font-bold text-emerald-500">{sub.paid_amount} <span className="text-[10px] font-normal opacity-70">ج.م</span></div>
          </div>
          <div className="flex-1 text-left">
            <div className="text-[10px] text-muted-foreground">متبقي</div>
            <div className="text-lg font-bold text-amber-500">{sub.remaining_amount} <span className="text-[10px] font-normal opacity-70">ج.م</span></div>
          </div>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden mt-2 flex">
          <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      {/* Actions grid — clean, no bordered tiles */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">الإجراءات</div>
        <div className="grid grid-cols-4 gap-1">
          <ActionItem icon={CreditCard} label="اشتراكي" onClick={() => navigate("/portal/subscription")} />
          <ActionItem icon={MessageCircle} label="رسائلي" badge={unreadChat} onClick={() => navigate("/portal/chat")} />
          <ActionItem icon={RefreshCw} label="تجديد" loading={requesting} onClick={requestRenewal} />
          <ActionItem icon={LifeBuoy} label="دعم" onClick={openSupport} />
          <ActionItem icon={Salad} label="غذائي" onClick={() => navigate("/portal/requests?tab=diet")} />
          <ActionItem icon={Dumbbell} label="تمرين" onClick={() => navigate("/portal/requests?tab=workout")} />
        </div>
      </div>

      {/* Captain — minimal row */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shrink-0">
            {sub.captain?.trim().charAt(0) || "ك"}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground">الكابتن</div>
            <div className="font-semibold truncate text-sm">{sub.captain}</div>
          </div>
        </div>
        <button
          onClick={() => navigate("/portal/chat")}
          className="p-2 active:scale-90 transition"
          aria-label="دردشة"
        >
          <MessageCircle className="h-5 w-5 text-primary" />
        </button>
      </div>
    </div>
  );
}

const ActionItem = ({ icon: Icon, label, onClick, loading, badge }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="relative flex flex-col items-center gap-1.5 py-3 active:scale-90 transition disabled:opacity-50"
  >
    <Icon className={`h-6 w-6 text-primary ${loading ? "animate-spin" : ""}`} strokeWidth={1.8} />
    <span className="text-[10px] font-medium text-foreground/80">{label}</span>
    {badge > 0 && (
      <span className="absolute top-1.5 right-3 min-w-[14px] h-[14px] bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center px-1">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </button>
);
