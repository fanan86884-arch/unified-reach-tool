import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  subscriberId: string;
  myUserId: string;
  myRole: "client" | "captain";
  className?: string;
}

interface Msg {
  id: string;
  subscriber_id: string;
  sender_role: "client" | "captain";
  sender_user_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const ChatThread = ({ subscriberId, myUserId, myRole, className }: Props) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("client_chat_messages")
        .select("*")
        .eq("subscriber_id", subscriberId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      setMsgs((data as any) || []);
      setLoading(false);
      // mark inbound as read
      const inboundUnread = (data || []).filter((m: any) => m.sender_role !== myRole && !m.is_read).map((m: any) => m.id);
      if (inboundUnread.length) {
        await supabase.from("client_chat_messages").update({ is_read: true }).in("id", inboundUnread);
      }
    };
    void load();

    const channel = supabase
      .channel(`chat-${subscriberId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_chat_messages", filter: `subscriber_id=eq.${subscriberId}` }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_role !== myRole && !m.is_read) {
          supabase.from("client_chat_messages").update({ is_read: true }).eq("id", m.id);
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [subscriberId, myRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { data, error } = await supabase
      .from("client_chat_messages")
      .insert({ subscriber_id: subscriberId, sender_role: myRole, sender_user_id: myUserId, content })
      .select()
      .single();
    setSending(false);
    if (error) return;
    setText("");
    setMsgs((prev) => (prev.some((x) => x.id === (data as any).id) ? prev : [...prev, data as any]));
  };

  return (
    <div className={`flex flex-col rounded-lg border border-border/50 bg-card ${className || ""}`}>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[60vh] min-h-[280px]">
        {loading && <div className="text-center py-6"><Loader2 className="h-4 w-4 animate-spin inline" /></div>}
        {!loading && msgs.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">ابدأ المحادثة</div>}
        {msgs.map((m) => {
          const mine = m.sender_role === myRole;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{format(parseISO(m.created_at), "dd/MM HH:mm")}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border/50 p-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="اكتب رسالة..."
          className="text-sm"
        />
        <Button size="icon" onClick={send} disabled={sending || !text.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
