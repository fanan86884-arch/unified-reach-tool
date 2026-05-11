import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Paperclip, Image as ImageIcon, X, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  content: string | null;
  created_at: string;
  is_read: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

export const ChatThread = ({ subscriberId, myUserId, myRole, className }: Props) => {
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
      setMsgs((prev) => (prev.some((x) => x.id === (data as any).id) ? prev : [...prev, data as any]));
    } catch (e: any) {
      toast({ title: "تعذر الإرسال", description: e?.message || "", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <div className={`flex flex-col rounded-lg border border-border/50 bg-card ${className || ""}`}>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[60vh] min-h-[280px]">
        {loading && <div className="text-center py-6"><Loader2 className="h-4 w-4 animate-spin inline" /></div>}
        {!loading && msgs.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">ابدأ المحادثة</div>}
        {msgs.map((m) => {
          const mine = m.sender_role === myRole;
          const isImg = m.attachment_type === "image" && m.attachment_url;
          const isFile = m.attachment_type === "file" && m.attachment_url;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-2 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {isImg && (
                  <button onClick={() => setPreviewImage(m.attachment_url!)} className="block mb-1">
                    <img src={m.attachment_url!} alt={m.attachment_name || "صورة"} className="rounded-lg max-h-56 object-cover" loading="lazy" />
                  </button>
                )}
                {isFile && (
                  <a href={m.attachment_url!} target="_blank" rel="noreferrer" className={`flex items-center gap-2 mb-1 px-2 py-1.5 rounded-md ${mine ? "bg-primary-foreground/10" : "bg-background/60"}`}>
                    <FileText className="h-4 w-4" />
                    <span className="text-xs truncate">{m.attachment_name || "ملف"}</span>
                  </a>
                )}
                {m.content && <div className="whitespace-pre-wrap break-words px-1">{m.content}</div>}
                <div className={`text-[10px] mt-1 px-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{format(parseISO(m.created_at), "dd/MM HH:mm")}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {pendingFile && (
        <div className="border-t border-border/50 p-2 flex items-center gap-2 bg-muted/30">
          {previewUrl && pendingFile.type.startsWith("image/") ? (
            <img src={previewUrl} alt="" className="h-12 w-12 object-cover rounded" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="flex-1 text-xs truncate">{pendingFile.name}</div>
          <Button size="icon" variant="ghost" onClick={() => setPendingFile(null)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="border-t border-border/50 p-2 flex gap-1.5 items-center">
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={pickFile} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
        <Button size="icon" variant="ghost" type="button" onClick={() => cameraRef.current?.click()} title="صورة">
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" type="button" onClick={() => fileRef.current?.click()} title="ملف">
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="اكتب رسالة..."
          className="text-sm flex-1"
        />
        <Button size="icon" onClick={send} disabled={sending || (!text.trim() && !pendingFile)}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>

    {previewImage && (
      <div onClick={() => setPreviewImage(null)} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out">
        <img src={previewImage} alt="" className="max-h-full max-w-full rounded-lg" />
        <button className="absolute top-4 right-4 p-2 rounded-full bg-background/20 text-white"><X className="h-5 w-5" /></button>
      </div>
    )}
    </>
  );
};
