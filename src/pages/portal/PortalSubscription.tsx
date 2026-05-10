import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, parseISO } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, Wallet, History, ScanLine } from "lucide-react";

const typeLabels: Record<string, string> = {
  monthly: "شهري", quarterly: "ربع سنوي", "semi-annual": "نصف سنوي", annual: "سنوي",
};

export default function PortalSubscription() {
  const session = usePortalSession("client");
  const { data: sub } = useClientSubscriber(session.subscriberId);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    if (!session.subscriberId) return;
    void (async () => {
      const [r, a] = await Promise.all([
        supabase.from("renewal_history").select("*").eq("subscriber_id", session.subscriberId).order("renewed_at", { ascending: false }).limit(50),
        supabase.from("attendance").select("*").eq("subscriber_id", session.subscriberId).order("checked_in_at", { ascending: false }).limit(50),
      ]);
      setRenewals(r.data || []);
      setAttendance(a.data || []);
    })();
  }, [session.subscriberId]);

  if (!sub) return null;
  const daysLeft = differenceInDays(parseISO(sub.end_date), new Date());
  const qrPayload = JSON.stringify({ t: "member", id: sub.id, p: sub.phone });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">اشتراكي</h1>

      <Card className="p-5 flex flex-col items-center gap-3 bg-gradient-to-br from-card to-card/50">
        <div className="text-sm text-muted-foreground">بطاقة العضوية</div>
        <div className="bg-white p-3 rounded-2xl">
          <QRCodeSVG value={qrPayload} size={180} />
        </div>
        <div className="text-xs text-muted-foreground">اعرضها للموظف عند الدخول</div>
      </Card>

      <Card className="p-5 space-y-3">
        <Row label="نوع الاشتراك" value={typeLabels[sub.subscription_type] || sub.subscription_type} highlight />
        <Row label="البداية" value={format(parseISO(sub.start_date), "dd/MM/yyyy")} icon={Calendar} />
        <Row label="النهاية" value={format(parseISO(sub.end_date), "dd/MM/yyyy")} icon={Calendar} />
        <Row label="الأيام المتبقية" value={daysLeft < 0 ? "منتهي" : `${daysLeft} يوم`} />
        <Row label="الكابتن" value={sub.captain} />
        <Row label="المدفوع" value={`${sub.paid_amount} ج.م`} icon={Wallet} valueClass="text-green-400" />
        <Row label="المتبقي" value={`${sub.remaining_amount} ج.م`} icon={Wallet} valueClass="text-orange-400" />
      </Card>

      <Tabs defaultValue="renewals">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="renewals" className="text-xs"><History className="h-3 w-3 ml-1" /> التجديدات</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs"><ScanLine className="h-3 w-3 ml-1" /> الحضور</TabsTrigger>
        </TabsList>
        <TabsContent value="renewals" className="space-y-2 mt-3">
          {renewals.length === 0 && <Empty text="لا يوجد سجل تجديدات" />}
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
          {attendance.length === 0 && <Empty text="لا يوجد سجل حضور" />}
          {attendance.map((a) => (
            <Card key={a.id} className="p-3 text-sm flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" />
              {format(parseISO(a.checked_in_at), "dd/MM/yyyy HH:mm")}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Row = ({ label, value, icon: Icon, valueClass, highlight }: any) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
    </span>
    <span className={`font-medium ${highlight ? "text-primary" : ""} ${valueClass || ""}`}>{value}</span>
  </div>
);
const Empty = ({ text }: { text: string }) => <div className="text-center text-sm text-muted-foreground py-6">{text}</div>;
