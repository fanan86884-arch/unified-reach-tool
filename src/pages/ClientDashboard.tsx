import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { signOutPortal } from "@/lib/portalAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, LogOut, Calendar, Wallet, MessageCircle, RefreshCw, ScanLine, Bell, History, StickyNote, AlertCircle, Salad, Dumbbell, MessagesSquare } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format, differenceInDays, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ChatThread } from "@/components/portal/ChatThread";
import { DietRequestForm } from "@/components/auth/DietRequestForm";
import { WorkoutRequestForm } from "@/components/auth/WorkoutRequestForm";

interface Subscriber {
  id: string;
  name: string;
  phone: string;
  subscription_type: string;
  start_date: string;
  end_date: string;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  is_paused: boolean;
  paused_until: string | null;
  captain: string;
}

const typeLabels: Record<string, string> = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  "semi-annual": "نصف سنوي",
  annual: "سنوي",
};

export default function ClientDashboard() {
  const session = usePortalSession("client");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sub, setSub] = useState<Subscriber | null>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [contactPhone, setContactPhone] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (session.loading) return;
    if (!session.userId) {
      navigate("/portal/login");
      return;
    }
    if (!session.subscriberId) {
      toast({ title: "حسابك غير مفعل", description: "تواصل مع الإدارة", variant: "destructive" });
      signOutPortal().then(() => navigate("/portal/login"));
      return;
    }
    void loadAll(session.subscriberId);
  }, [session.loading, session.userId, session.subscriberId]);

  const loadAll = async (subscriberId: string) => {
    setLoading(true);
    const [subRes, renRes, attRes, notesRes, notifRes, contactRes] = await Promise.all([
      supabase.from("subscribers").select("*").eq("id", subscriberId).maybeSingle(),
      supabase.from("renewal_history").select("*").eq("subscriber_id", subscriberId).order("renewed_at", { ascending: false }).limit(50),
      supabase.from("attendance").select("*").eq("subscriber_id", subscriberId).order("checked_in_at", { ascending: false }).limit(50),
      supabase.from("client_notes").select("*").eq("subscriber_id", subscriberId).order("created_at", { ascending: false }).limit(50),
      supabase.from("client_notifications").select("*").eq("subscriber_id", subscriberId).order("created_at", { ascending: false }).limit(50),
      supabase.from("contact_settings").select("*").maybeSingle(),
    ]);
    setSub(subRes.data as any);
    setRenewals(renRes.data || []);
    setAttendance(attRes.data || []);
    setNotes(notesRes.data || []);
    setNotifications(notifRes.data || []);
    // Try to find captain phone from contact_settings.captains
    const captains = (contactRes.data as any)?.captains;
    if (Array.isArray(captains) && subRes.data) {
      const found = captains.find((c: any) => (subRes.data as any).captain?.includes(c.name?.replace(/كابتن|الكابتن/g, "").trim()));
      setContactPhone(found?.phone || captains[0]?.phone || "");
    }
    setLoading(false);
  };

  const requestRenewal = async () => {
    if (!sub) return;
    setRequesting(true);
    const { error } = await supabase.from("subscription_requests").insert({
      name: sub.name,
      phone: sub.phone,
      subscription_type: sub.subscription_type,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
      paid_amount: 0,
      remaining_amount: 0,
      status: "pending",
    });
    setRequesting(false);
    if (error) toast({ title: "فشل الطلب", description: error.message, variant: "destructive" });
    else toast({ title: "تم إرسال طلب التجديد", description: "سيتم التواصل معك قريباً" });
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("client_notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  if (session.loading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!sub) return null;

  const daysLeft = differenceInDays(parseISO(sub.end_date), new Date());
  const expiringSoon = daysLeft >= 0 && daysLeft <= 7;
  const expired = daysLeft < 0;
  const qrPayload = JSON.stringify({ t: "member", id: sub.id, p: sub.phone });

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <div className="max-w-md mx-auto px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{sub.name}</h1>
            <p className="text-xs text-muted-foreground">{sub.phone}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOutPortal().then(() => navigate("/portal/login"))}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Expiry banner */}
        {(expiringSoon || expired) && (
          <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${expired ? "bg-destructive/15 text-destructive" : "bg-orange-500/15 text-orange-400"}`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{expired ? "اشتراكك انتهى" : `اشتراكك ينتهي خلال ${daysLeft} يوم`}</span>
          </div>
        )}

        {/* Subscription card */}
        <Card className="p-5 space-y-4 bg-gradient-to-br from-card to-card/50 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">نوع الاشتراك</span>
            <span className="font-bold text-primary">{typeLabels[sub.subscription_type] || sub.subscription_type}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" /> البداية</div>
              <div className="font-medium">{format(parseISO(sub.start_date), "dd/MM/yyyy")}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" /> النهاية</div>
              <div className="font-medium">{format(parseISO(sub.end_date), "dd/MM/yyyy")}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">الأيام المتبقية</div>
              <div className={`font-bold ${expired ? "text-destructive" : expiringSoon ? "text-orange-400" : "text-green-400"}`}>
                {expired ? "منتهي" : `${daysLeft} يوم`}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">الكابتن</div>
              <div className="font-medium truncate">{sub.captain}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground"><Wallet className="h-3 w-3" /> المدفوع</div>
              <div className="font-medium text-green-400">{sub.paid_amount} ج.م</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground"><Wallet className="h-3 w-3" /> المتبقي</div>
              <div className="font-medium text-orange-400">{sub.remaining_amount} ج.م</div>
            </div>
          </div>
        </Card>

        {/* QR Card */}
        <Card className="p-5 flex flex-col items-center gap-3">
          <div className="text-sm text-muted-foreground">بطاقة العضوية</div>
          <div className="bg-white p-3 rounded-lg">
            <QRCodeSVG value={qrPayload} size={180} />
          </div>
          <div className="text-xs text-muted-foreground">اعرضها للموظف عند الدخول</div>
        </Card>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate("/checkin")}>
            <ScanLine className="h-5 w-5 text-primary" />
            <span className="text-xs">حضور</span>
          </Button>
          <Button variant="outline" className="flex-col h-auto py-3 gap-1" disabled={requesting} onClick={requestRenewal}>
            <RefreshCw className={`h-5 w-5 text-primary ${requesting ? "animate-spin" : ""}`} />
            <span className="text-xs">تجديد</span>
          </Button>
          <Button variant="outline" className="flex-col h-auto py-3 gap-1" disabled={!contactPhone} onClick={() => {
            const num = contactPhone.replace(/\D/g, "").replace(/^0/, "20");
            window.open(`https://wa.me/${num}`, "_blank");
          }}>
            <MessageCircle className="h-5 w-5 text-green-500" />
            <span className="text-xs">واتساب</span>
          </Button>
        </div>

        {/* Plan request sheets */}
        <div className="grid grid-cols-2 gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-auto py-3 gap-2">
                <Salad className="h-4 w-4 text-green-500" />
                <span className="text-xs">طلب نظام غذائي</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" dir="rtl">
              <SheetHeader><SheetTitle>طلب نظام غذائي</SheetTitle></SheetHeader>
              <div className="mt-4">
                <DietRequestForm phone={sub.phone} name={sub.name} />
              </div>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-auto py-3 gap-2">
                <Dumbbell className="h-4 w-4 text-orange-500" />
                <span className="text-xs">طلب جدول تمرين</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" dir="rtl">
              <SheetHeader><SheetTitle>طلب جدول تمرين</SheetTitle></SheetHeader>
              <div className="mt-4">
                <WorkoutRequestForm phone={sub.phone} name={sub.name} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="chat" className="text-xs px-1"><MessagesSquare className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs px-1"><Bell className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="renewals" className="text-xs px-1"><History className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs px-1"><ScanLine className="h-3 w-3" /></TabsTrigger>
            <TabsTrigger value="notes" className="text-xs px-1"><StickyNote className="h-3 w-3" /></TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-3">
            {session.userId && (
              <ChatThread subscriberId={sub.id} myUserId={session.userId} myRole="client" />
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-2 mt-3">
            {notifications.length === 0 && <EmptyHint text="لا توجد إشعارات" />}
            {notifications.map((n) => (
              <Card key={n.id} className={`p-3 ${!n.is_read ? "border-primary/40 bg-primary/5" : ""}`} onClick={() => !n.is_read && markNotifRead(n.id)}>
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{n.body}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{format(parseISO(n.created_at), "dd/MM/yyyy HH:mm")}</div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="renewals" className="space-y-2 mt-3">
            {renewals.length === 0 && <EmptyHint text="لا يوجد سجل تجديدات" />}
            {renewals.map((r) => (
              <Card key={r.id} className="p-3 flex justify-between text-sm">
                <div>
                  <div className="font-medium">{format(parseISO(r.start_date), "dd/MM/yyyy")} → {format(parseISO(r.end_date), "dd/MM/yyyy")}</div>
                  <div className="text-xs text-muted-foreground">{format(parseISO(r.renewed_at), "dd/MM/yyyy")}</div>
                </div>
                <div className="text-green-400 font-bold">{r.paid_amount} ج.م</div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="attendance" className="space-y-2 mt-3">
            {attendance.length === 0 && <EmptyHint text="لا يوجد سجل حضور" />}
            {attendance.map((a) => (
              <Card key={a.id} className="p-3 text-sm flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" />
                {format(parseISO(a.checked_in_at), "dd/MM/yyyy HH:mm")}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="space-y-2 mt-3">
            {notes.length === 0 && <EmptyHint text="لا توجد ملاحظات من الكابتن" />}
            {notes.map((n) => (
              <Card key={n.id} className="p-3 text-sm">
                <div>{n.note}</div>
                <div className="text-xs text-muted-foreground mt-1">{format(parseISO(n.created_at), "dd/MM/yyyy")}</div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const EmptyHint = ({ text }: { text: string }) => (
  <div className="text-center text-sm text-muted-foreground py-6">{text}</div>
);
