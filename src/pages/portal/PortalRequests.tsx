import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Salad, Dumbbell, StickyNote, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DietRequestForm } from "@/components/auth/DietRequestForm";
import { WorkoutRequestForm } from "@/components/auth/WorkoutRequestForm";

export default function PortalRequests() {
  const session = usePortalSession("client");
  const { data: sub } = useClientSubscriber(session.subscriberId);
  const [params, setParams] = useSearchParams();
  const initialTab = params.get("tab") === "workout" ? "workout" : params.get("tab") === "notes" ? "notes" : "diet";
  const [tab, setTab] = useState(initialTab);
  const [diet, setDiet] = useState<any[]>([]);
  const [workout, setWorkout] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    if (!sub) return;
    void (async () => {
      const [d, w, n] = await Promise.all([
        supabase.from("diet_requests").select("*").eq("phone", sub.phone).order("created_at", { ascending: false }).limit(20),
        supabase.from("workout_requests").select("*").eq("phone", sub.phone).order("created_at", { ascending: false }).limit(20),
        supabase.from("client_notes").select("*").eq("subscriber_id", sub.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setDiet(d.data || []);
      setWorkout(w.data || []);
      setNotes(n.data || []);
    })();
  }, [sub]);

  if (!sub) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">طلباتي</h1>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setParams({ tab: v }); }}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="diet" className="text-xs"><Salad className="h-3 w-3 ml-1" /> غذاء</TabsTrigger>
          <TabsTrigger value="workout" className="text-xs"><Dumbbell className="h-3 w-3 ml-1" /> تمرين</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs"><StickyNote className="h-3 w-3 ml-1" /> ملاحظات</TabsTrigger>
        </TabsList>

        <TabsContent value="diet" className="space-y-3 mt-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full"><Plus className="h-4 w-4 ml-1" /> طلب نظام غذائي جديد</Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" dir="rtl">
              <SheetHeader><SheetTitle>طلب نظام غذائي</SheetTitle></SheetHeader>
              <div className="mt-4"><DietRequestForm phone={sub.phone} name={sub.name} /></div>
            </SheetContent>
          </Sheet>
          {diet.length === 0 && <Empty text="لا توجد طلبات" />}
          {diet.map((r) => <RequestCard key={r.id} title="نظام غذائي" status={r.status} date={r.created_at} />)}
        </TabsContent>

        <TabsContent value="workout" className="space-y-3 mt-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full"><Plus className="h-4 w-4 ml-1" /> طلب جدول تمرين جديد</Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" dir="rtl">
              <SheetHeader><SheetTitle>طلب جدول تمرين</SheetTitle></SheetHeader>
              <div className="mt-4"><WorkoutRequestForm phone={sub.phone} name={sub.name} /></div>
            </SheetContent>
          </Sheet>
          {workout.length === 0 && <Empty text="لا توجد طلبات" />}
          {workout.map((r) => <RequestCard key={r.id} title="جدول تمرين" status={r.status} date={r.created_at} />)}
        </TabsContent>

        <TabsContent value="notes" className="space-y-2 mt-3">
          {notes.length === 0 && <Empty text="لا توجد ملاحظات من الكابتن" />}
          {notes.map((n) => (
            <Card key={n.id} className="p-3 text-sm">
              <div>{n.note}</div>
              <div className="text-xs text-muted-foreground mt-1">{format(parseISO(n.created_at), "dd/MM/yyyy")}</div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const RequestCard = ({ title, status, date }: any) => (
  <Card className="p-3 flex items-center justify-between text-sm">
    <div>
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{format(parseISO(date), "dd/MM/yyyy")}</div>
    </div>
    <span className={`text-xs px-2 py-1 rounded-full ${status === "pending" ? "bg-amber-500/20 text-amber-400" : status === "completed" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
      {status === "pending" ? "قيد المعالجة" : status === "completed" ? "تم" : status}
    </span>
  </Card>
);
const Empty = ({ text }: { text: string }) => <div className="text-center text-sm text-muted-foreground py-8">{text}</div>;
