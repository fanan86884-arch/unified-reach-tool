import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client.runtime";
import { ChatThread } from "@/components/portal/ChatThread";
import { ArrowRight, Loader2, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface InboxItem {
  subscriber_id: string;
  name: string;
  last_message: string | null;
  last_at: string;
  unread: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const StaffChatInbox = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: msgs } = await supabase
      .from("client_chat_messages")
      .select("subscriber_id, content, attachment_type, created_at, sender_role, is_read")
      .order("created_at", { ascending: false })
      .limit(500);

    const map = new Map<string, InboxItem>();
    for (const m of msgs || []) {
      const id = (m as any).subscriber_id as string;
      const existing = map.get(id);
      const preview = (m as any).content || ((m as any).attachment_type === "image" ? "📷 صورة" : (m as any).attachment_type ? "📎 ملف" : "");
      const unreadInc = !(m as any).is_read && (m as any).sender_role === "client" ? 1 : 0;
      if (!existing) {
        map.set(id, {
          subscriber_id: id,
          name: "",
          last_message: preview,
          last_at: (m as any).created_at,
          unread: unreadInc,
        });
      } else {
        existing.unread += unreadInc;
      }
    }

    const ids = Array.from(map.keys());
    if (ids.length) {
      const { data: subs } = await supabase
        .from("subscribers")
        .select("id, name")
        .in("id", ids);
      for (const s of subs || []) {
        const item = map.get((s as any).id);
        if (item) item.name = (s as any).name;
      }
    }

    setItems(Array.from(map.values()).sort((a, b) => (a.last_at < b.last_at ? 1 : -1)));
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    void load();
    const channel = supabase
      .channel("staff-chat-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_chat_messages" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {selected && (
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="h-8 w-8">
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <MessagesSquare className="h-5 w-5 text-primary" />
            {selected ? selected.name : "رسائل العملاء"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {selected ? (
            user?.id ? (
              <div className="h-full p-3">
                <ChatThread
                  subscriberId={selected.id}
                  myUserId={user.id}
                  myRole="captain"
                  className="h-full"
                />
              </div>
            ) : null
          ) : (
            <div className="h-full overflow-y-auto">
              {loading && (
                <div className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">لا توجد رسائل</div>
              )}
              {items.map((it) => (
                <button
                  key={it.subscriber_id}
                  onClick={() => setSelected({ id: it.subscriber_id, name: it.name || "عميل" })}
                  className="w-full text-right px-4 py-3 border-b border-border/40 hover:bg-muted/40 active:bg-muted flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate">{it.name || "عميل"}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(it.last_at), { addSuffix: true, locale: ar })}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{it.last_message}</div>
                  </div>
                  {it.unread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {it.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
