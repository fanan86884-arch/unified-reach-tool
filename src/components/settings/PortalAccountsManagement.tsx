import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";
import { useCaptains } from "@/hooks/useCaptains";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, QrCode, Search, RefreshCw, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const PortalAccountsManagement = () => {
  const { toast } = useToast();
  const { captains } = useCaptains();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [linkedClientIds, setLinkedClientIds] = useState<Set<string>>(new Set());
  const [linkedCaptains, setLinkedCaptains] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pwInput, setPwInput] = useState<Record<string, string>>({});
  const [captainPw, setCaptainPw] = useState<Record<string, string>>({});
  const [captainLoginId, setCaptainLoginId] = useState<Record<string, string>>({});
  const [gymTokens, setGymTokens] = useState<any[]>([]);
  const [qrDialog, setQrDialog] = useState<string | null>(null);

  const load = async () => {
    const [subs, clients, capAccs, tokens] = await Promise.all([
      supabase.from("subscribers").select("id, name, phone").eq("is_archived", false).order("name"),
      supabase.from("client_accounts").select("subscriber_id"),
      supabase.from("captain_accounts").select("captain_name"),
      supabase.from("gym_qr_tokens").select("*").order("created_at", { ascending: false }),
    ]);
    setSubscribers(subs.data || []);
    setLinkedClientIds(new Set((clients.data || []).map((c: any) => c.subscriber_id)));
    setLinkedCaptains(new Set((capAccs.data || []).map((c: any) => c.captain_name)));
    setGymTokens(tokens.data || []);
  };

  useEffect(() => { void load(); }, []);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const setupClient = async (subscriberId: string) => {
    let pw = pwInput[subscriberId];
    if (!pw || pw.length < 6) pw = generatePassword();
    setBusyId(subscriberId);
    const { data, error } = await supabase.functions.invoke("create-client-account", {
      body: { subscriber_id: subscriberId, password: pw },
    });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast({ title: "فشل", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setLinkedClientIds((p) => new Set([...p, subscriberId]));
    navigator.clipboard?.writeText(`الموبايل: ${(data as any).phone}\nكلمة السر: ${pw}`);
    toast({ title: "تم الإنشاء", description: `كلمة السر: ${pw} (تم النسخ)` });
    setPwInput((p) => ({ ...p, [subscriberId]: "" }));
  };

  const setupCaptain = async (captainName: string) => {
    let pw = captainPw[captainName];
    let loginId = captainLoginId[captainName];
    if (!pw || pw.length < 6) pw = generatePassword();
    if (!loginId) loginId = captainName.replace(/كابتن|الكابتن/g, "").trim();
    setBusyId(captainName);
    const { data, error } = await supabase.functions.invoke("create-captain-account", {
      body: { captain_name: captainName, login_id: loginId, password: pw },
    });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast({ title: "فشل", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setLinkedCaptains((p) => new Set([...p, captainName]));
    navigator.clipboard?.writeText(`اسم الدخول: ${(data as any).login_id}\nكلمة السر: ${pw}`);
    toast({ title: "تم الإنشاء", description: `الدخول: ${(data as any).login_id} / ${pw} (تم النسخ)` });
    setCaptainPw((p) => ({ ...p, [captainName]: "" }));
  };

  const generateNewToken = async () => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("gym_qr_tokens").insert({ token, label: "Gym QR", is_active: true });
    if (error) { toast({ title: "فشل", description: error.message, variant: "destructive" }); return; }
    void load();
    toast({ title: "تم إنشاء رمز جديد" });
  };

  const filtered = subscribers.filter((s) => !search || s.name.includes(search) || s.phone.includes(search));

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-bold mb-1">حسابات البورتال</h3>
        <p className="text-xs text-muted-foreground">أنشئ حسابات للعملاء والكباتن وأدر رموز QR للحضور</p>
      </div>

      <Tabs defaultValue="clients">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="clients">العملاء</TabsTrigger>
          <TabsTrigger value="captains">الكباتن</TabsTrigger>
          <TabsTrigger value="qr">رموز QR</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-3 mt-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="pr-10" />
          </div>
          <div className="space-y-2 max-h-80 overflow-auto">
            {filtered.slice(0, 50).map((s) => {
              const linked = linkedClientIds.has(s.id);
              return (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.phone} {linked && <span className="text-green-400">• مفعل</span>}</div>
                  </div>
                  <Input
                    type="text"
                    placeholder="كلمة سر"
                    value={pwInput[s.id] || ""}
                    onChange={(e) => setPwInput((p) => ({ ...p, [s.id]: e.target.value }))}
                    className="h-8 w-24 text-xs"
                  />
                  <Button size="sm" variant={linked ? "outline" : "default"} disabled={busyId === s.id} onClick={() => setupClient(s.id)}>
                    {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : linked ? <KeyRound className="h-3 w-3" /> : "إنشاء"}
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="captains" className="space-y-3 mt-3">
          {captains.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">لا يوجد كباتن</div>}
          {captains.map((cap) => {
            const linked = linkedCaptains.has(cap);
            return (
              <div key={cap} className="space-y-2 p-3 rounded border border-border/50">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{cap}</div>
                  {linked && <span className="text-xs text-green-400">مفعل</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">اسم الدخول</Label>
                    <Input value={captainLoginId[cap] || ""} onChange={(e) => setCaptainLoginId((p) => ({ ...p, [cap]: e.target.value }))} placeholder="مثال: mohamed" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">كلمة السر</Label>
                    <Input value={captainPw[cap] || ""} onChange={(e) => setCaptainPw((p) => ({ ...p, [cap]: e.target.value }))} placeholder="auto" className="h-8 text-xs" />
                  </div>
                </div>
                <Button size="sm" disabled={busyId === cap} onClick={() => setupCaptain(cap)} className="w-full">
                  {busyId === cap ? <Loader2 className="h-3 w-3 animate-spin" /> : linked ? "تحديث كلمة السر" : "إنشاء حساب"}
                </Button>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="qr" className="space-y-3 mt-3">
          <Button onClick={generateNewToken} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 ml-2" /> إنشاء رمز QR جديد
          </Button>
          {gymTokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono truncate">{t.token.slice(0, 16)}...</div>
                <div className="text-[10px] text-muted-foreground">{t.label} {t.is_active ? "• نشط" : "• معطل"}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setQrDialog(t.token)}>
                <QrCode className="h-3 w-3 ml-1" /> عرض
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/checkin?token=${t.token}`);
                toast({ title: "تم نسخ الرابط" });
              }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!qrDialog} onOpenChange={(o) => !o && setQrDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-center">QR الجيم</DialogTitle></DialogHeader>
          {qrDialog && (
            <div className="flex flex-col items-center gap-3 p-2">
              <div className="bg-white p-4 rounded">
                <QRCodeSVG value={`${window.location.origin}/checkin?token=${qrDialog}`} size={240} />
              </div>
              <div className="text-xs text-muted-foreground text-center">اطبع هذا الرمز وعلقه في الجيم</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
