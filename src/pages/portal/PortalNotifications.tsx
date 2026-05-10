import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { Card } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Bell } from "lucide-react";

export default function PortalNotifications() {
  const session = usePortalSession("client");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!session.subscriberId) return;
    void (async () => {
      const { data } = await supabase
        .from("client_notifications")
        .select("*")
        .eq("subscriber_id", session.subscriberId)
        .order("created_at", { ascending: false })
        .limit(100);
      setItems(data || []);
      const unread = (data || []).filter((n: any) => !n.is_read).map((n: any) => n.id);
      if (unread.length) {
        await supabase.from("client_notifications").update({ is_read: true }).in("id", unread);
      }
    })();
  }, [session.subscriberId]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="h-5 w-5" /> الإشعارات</h1>
      {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-10">لا توجد إشعارات</div>}
      <div className="space-y-2">
        {items.map((n) => (
          <Card key={n.id} className={`p-3 ${!n.is_read ? "border-primary/40 bg-primary/5" : ""}`}>
            <div className="font-medium text-sm">{n.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{n.body}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{format(parseISO(n.created_at), "dd/MM/yyyy HH:mm")}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
