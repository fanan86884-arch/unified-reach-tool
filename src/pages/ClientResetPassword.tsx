import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, Lock, User, KeyRound } from "lucide-react";
import { signInClient } from "@/lib/portalAuth";

export default function ClientResetPassword() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "كلمة السر قصيرة", description: "6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "كلمتا السر غير متطابقتين", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/client-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({ phone, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "فشل التعيين");

      // Auto-login
      const { error } = await signInClient(phone, password);
      if (error) {
        toast({ title: "تم تغيير كلمة السر", description: "سجل دخول الآن" });
        navigate("/portal/login");
      } else {
        toast({ title: "تم تغيير كلمة السر بنجاح" });
        navigate("/portal");
      }
    } catch (e: any) {
      toast({ title: "تعذر إعادة التعيين", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-sm p-6 space-y-5 border-border/50">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">إعادة تعيين كلمة السر</h1>
          <p className="text-xs text-muted-foreground">أدخل رقم موبايلك واسمك كما هو مسجل في الجيم</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>رقم الموبايل</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="numeric" placeholder="01xxxxxxxxx" required className="pr-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>الاسم</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نفس الاسم المسجل" required className="pr-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>كلمة السر الجديدة</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} className="pr-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>تأكيد كلمة السر</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required minLength={6} className="pr-10" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-orange-500">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تعيين كلمة السر"}
          </Button>
        </form>
        <div className="text-center text-xs text-muted-foreground">
          <Link to="/portal/login" className="hover:text-primary">العودة لتسجيل الدخول</Link>
        </div>
      </Card>
    </div>
  );
}
