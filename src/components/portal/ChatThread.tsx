import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Paperclip, Image as ImageIcon, X, FileText, Check, CheckCheck, MessageCircle } from "lucide-react";
import { format, parseISO, isToday, isYesterday, isSameDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  subscriberId: string;
  myUserId: string;
  myRole: "client" | "captain";
  className?: string;
  bare?: boolean;
}

interface Msg {
  id: string;
  subscriber_id: string;
  sender_role: "client" | "captain";
  sender_user_id: string;
  content: string | null;
  created_at: string;
  is_read: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

const dayLabel = (d: Date) => {
  if (isToday(d)) return "اليوم";
  if (isYesterday(d)) return "أمس";
  return format(d, "EEEE dd MMMM", { locale: ar });
};

export const ChatThread = ({ subscriberId, myUserId, myRole, className, bare = false }: Props) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "client_chat_messages", filter: `subscriber_id=eq.${subscriberId}` }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
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

  useEffect(() => {
    if (!pendingFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const autosize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "حجم الملف كبير", description: "الحد الأقصى 10 ميجا", variant: "destructive" });
      return;
    }
    setPendingFile(f);
  };

  const uploadAttachment = async (file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${myUserId}/${subscriberId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return { url: data.publicUrl, type: file.type.startsWith("image/") ? "image" : "file", name: file.name };
  };

  const send = async () => {
    const content = text.trim();
    if (!content && !pendingFile) return;
    setSending(true);
    try {
      let att: { url: string; type: string; name: string } | null = null;
      if (pendingFile) att = await uploadAttachment(pendingFile);

      const { data, error } = await supabase
        .from("client_chat_messages")
        .insert({
          subscriber_id: subscriberId,
          sender_role: myRole,
          sender_user_id: myUserId,
          content: content || null,
          attachment_url: att?.url ?? null,
          attachment_type: att?.type ?? null,
          attachment_name: att?.name ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      setText("");
      setPendingFile(null);
      if (inputRef.current) inputRef.current.style.height = "auto";
      setMsgs((prev) => (prev.some((x) => x.id === (data as any).id) ? prev : [...prev, data as any]));
    } catch (e: any) {
      toast({ title: "تعذر الإرسال", description: e?.message || "", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Group consecutive messages by sender for tail bubbles
  const grouped = useMemo(() => {
    const items: Array<{ kind: "day"; key: string; label: string } | { kind: "msg"; m: Msg; firstOfGroup: boolean; lastOfGroup: boolean }> = [];
    let lastDate: Date | null = null;
    msgs.forEach((m, i) => {
      const d = parseISO(m.created_at);
      if (!lastDate || !isSameDay(lastDate, d)) {
        items.push({ kind: "day", key: `d-${m.id}`, label: dayLabel(d) });
        lastDate = d;
      }
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      const firstOfGroup = !prev || prev.sender_role !== m.sender_role || !isSameDay(parseISO(prev.created_at), d);
      const lastOfGroup = !next || next.sender_role !== m.sender_role || !isSameDay(parseISO(next.created_at), d);
      items.push({ kind: "msg", m, firstOfGroup, lastOfGroup });
    });
    return items;
  }, [msgs]);

  return (
    <>
      <div className={cn(
        "flex flex-col overflow-hidden",
        bare ? "bg-transparent" : "rounded-2xl bg-card/30 backdrop-blur",
        className
      )}>
        <div
          className={cn("flex-1 overflow-y-auto px-3 py-4 space-y-1", bare ? "" : "max-h-[68vh] min-h-[320px]")}
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.06), transparent 60%), radial-gradient(circle at 80% 100%, hsl(var(--accent) / 0.05), transparent 60%)",
          }}
        >
          {loading && (
            <div className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
          )}
          {!loading && msgs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <div className="p-4 rounded-full bg-primary/10">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <div className="text-sm font-medium">ابدأ المحادثة</div>
              <div className="text-xs text-muted-foreground max-w-[220px]">اكتب رسالتك الأولى — الكابتن سيرد عليك في أقرب وقت</div>
            </div>
          )}

          {grouped.map((item) => {
            if (item.kind === "day") {
              return (
                <div key={item.key} className="flex justify-center my-3 select-none">
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted/70 text-muted-foreground backdrop-blur">
                    {item.label}
                  </span>
                </div>
              );
            }
            const m = item.m;
            const mine = m.sender_role === myRole;
            const isImg = m.attachment_type === "image" && m.attachment_url;
            const isFile = m.attachment_type === "file" && m.attachment_url;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  mine ? "justify-start" : "justify-end",
                  item.lastOfGroup ? "mb-2" : "mb-0.5"
                )}
              >
                <div
                  className={cn(
                    "max-w-[78%] px-3 py-2 text-sm",
                    mine
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                      : "bg-muted text-foreground",
                    // bubble corners with tail
                    "rounded-2xl",
                    mine && item.lastOfGroup && "rounded-bl-md",
                    !mine && item.lastOfGroup && "rounded-br-md"
                  )}
                >
                  {isImg && (
                    <button onClick={() => setPreviewImage(m.attachment_url!)} className="block mb-1 -mx-1 -mt-1">
                      <img src={m.attachment_url!} alt={m.attachment_name || "صورة"} className="rounded-xl max-h-60 object-cover" loading="lazy" />
                    </button>
                  )}
                  {isFile && (
                    <a
                      href={m.attachment_url!}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg",
                        mine ? "bg-primary-foreground/15" : "bg-background/70"
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="text-xs truncate">{m.attachment_name || "ملف"}</span>
                    </a>
                  )}
                  {m.content && <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>}
                  <div className={cn(
                    "flex items-center gap-1 mt-0.5 text-[10px]",
                    mine ? "text-primary-foreground/75 justify-start" : "text-muted-foreground justify-end"
                  )}>
                    <span>{format(parseISO(m.created_at), "HH:mm")}</span>
                    {mine && (
                      m.is_read
                        ? <CheckCheck className="h-3 w-3 text-sky-300" />
                        : <Check className="h-3 w-3 opacity-80" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {pendingFile && (
          <div className="p-2 flex items-center gap-2 bg-muted/40">
            {previewUrl && pendingFile.type.startsWith("image/") ? (
              <img src={previewUrl} alt="" className="h-12 w-12 object-cover rounded-lg" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 text-xs truncate">{pendingFile.name}</div>
            <Button size="icon" variant="ghost" onClick={() => setPendingFile(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}

        <div className="p-2 flex gap-1 items-end bg-background/60 backdrop-blur">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={pickFile} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
          <Button size="icon" variant="ghost" type="button" className="h-9 w-9 shrink-0" onClick={() => cameraRef.current?.click()} title="صورة">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button size="icon" variant="ghost" type="button" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()} title="ملف">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); autosize(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="اكتب رسالة..."
            rows={1}
            className="flex-1 resize-none bg-muted/60 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition leading-relaxed max-h-[120px]"
          />
          <Button
            size="icon"
            onClick={send}
            disabled={sending || (!text.trim() && !pendingFile)}
            className="h-9 w-9 shrink-0 rounded-full bg-primary hover:bg-primary/90 transition active:scale-90"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={previewImage} alt="" className="max-h-full max-w-full rounded-lg" />
          <button className="absolute top-4 right-4 p-2 rounded-full bg-background/20 text-white"><X className="h-5 w-5" /></button>
        </div>
      )}
    </>
  );
};
