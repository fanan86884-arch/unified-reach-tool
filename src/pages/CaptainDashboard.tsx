import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client.runtime";
import { usePortalSession } from "@/hooks/usePortalSession";
import { signOutPortal } from "@/lib/portalAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, LogOut, Search, Plus, Trash2, ChevronDown, ChevronUp, MessagesSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInDays } from "date-fns";
import { ChatThread } from "@/components/portal/ChatThread";

export default function CaptainDashboard() {
  const session = usePortalSession("captain");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notesByClient, setNotesByClient] = useState<Record<string, any[]>>({});
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (session.loading) return;
    if (!session.userId) { navigate("/captain/login"); return; }
    if (!session.captainName) { signOutPortal().then(() => navigate("/captain/login")); return; }
    void loadClients();
  }, [session.loading, session.userId, session.captainName]);

  const loadClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscribers")
      .select("*")
      .eq("captain", session.captainName)
      .eq("is_archived", false)
      .order("end_date", { ascending: true });
    setClients(data || []);
    setLoading(false);
  };

  const toggleOpen = async (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (!notesByClient[id]) {
      const { data } = await supabase.from("client_notes").select("*").eq("subscriber_id", id).order("created_at", { ascending: false });
      setNotesByClient((p) => ({ ...p, [id]: data || [] }));
    }
  };

  const addNote = async (subscriberId: string) => {
    if (!newNote.trim() || !session.userId) return;
    const { data, error } = await supabase.from("client_notes").insert({
      subscriber_id: subscriberId,
      captain_user_id: session.userId,
      note: newNote.trim(),
    }).select().single();
    if (error) { toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" }); return; }
    setNotesByClient((p) => ({ ...p, [subscriberId]: [data, ...(p[subscriberId] || [])] }));
    setNewNote("");
  };

  const deleteNote = async (subscriberId: string, noteId: string) => {
    const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
    if (error) { toast({ title: "فشل الحذف", variant: "destructive" }); return; }
    setNotesByClient((p) => ({ ...p, [subscriberId]: (p[subscriberId] || []).filter((n) => n.id !== noteId) }));
  };

  if (session.loading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const filtered = clients.filter((c) => !search || c.name.includes(search) || c.phone.includes(search));

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <div className="max-w-md mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">{session.captainName}</h1>
            <p className="text-xs text-muted-foreground">{clients.length} عميل</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOutPortal().then(() => navigate("/captain/login"))}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الموبايل" className="pr-10" />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && <div className="text-center text-sm text-muted-foreground py-6">لا يوجد عملاء</div>}
          {filtered.map((c) => {
            const days = differenceInDays(parseISO(c.end_date), new Date());
            const isOpen = openId === c.id;
            return (
              <Card key={c.id} className="overflow-hidden">
                <button className="w-full p-3 flex items-center justify-between" onClick={() => toggleOpen(c.id)}>
                  <div className="text-right">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${days < 0 ? "text-destructive" : days <= 7 ? "text-orange-400" : "text-green-400"}`}>
                      {days < 0 ? "منتهي" : `${days} يوم`}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">البداية:</span> {format(parseISO(c.start_date), "dd/MM/yyyy")}</div>
                      <div><span className="text-muted-foreground">النهاية:</span> {format(parseISO(c.end_date), "dd/MM/yyyy")}</div>
                      <div><span className="text-muted-foreground">المدفوع:</span> {c.paid_amount} ج.م</div>
                      <div><span className="text-muted-foreground">المتبقي:</span> {c.remaining_amount} ج.م</div>
                    </div>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <MessagesSquare className="h-4 w-4 text-primary" />
                          محادثة مع العميل
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[85vh] flex flex-col" dir="rtl">
                        <SheetHeader><SheetTitle>{c.name}</SheetTitle></SheetHeader>
                        <div className="mt-3 flex-1 min-h-0">
                          {session.userId && <ChatThread subscriberId={c.id} myUserId={session.userId} myRole="captain" className="h-full" />}
                        </div>
                      </SheetContent>
                    </Sheet>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">الملاحظات</div>
                      {(notesByClient[c.id] || []).map((n) => (
                        <div key={n.id} className="bg-muted/30 rounded p-2 flex items-start justify-between gap-2 text-xs">
                          <div className="flex-1">
                            <div>{n.note}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">{format(parseISO(n.created_at), "dd/MM/yyyy")}</div>
                          </div>
                          {n.captain_user_id === session.userId && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteNote(c.id, n.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Textarea value={openId === c.id ? newNote : ""} onChange={(e) => setNewNote(e.target.value)} placeholder="أضف ملاحظة..." className="text-xs min-h-[60px]" />
                        <Button size="icon" onClick={() => addNote(c.id)} disabled={!newNote.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
