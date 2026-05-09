import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInClient } from "@/lib/portalAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, Lock } from "lucide-react";

export default function ClientLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInClient(phone, password);
    setLoading(false);
    if (error) {
      toast({ title: "تعذر تسجيل الدخول", description: error.message === "Invalid login credentials" ? "رقم الموبايل أو كلمة السر غير صحيحة" : error.message, variant: "destructive" });
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") || "/portal";
    navigate(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-sm p-6 space-y-5 border-border/50">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">بوابة العميل</h1>
          <p className="text-sm text-muted-foreground">تابع اشتراكك ومواعيدك</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>رقم الموبايل</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="numeric" placeholder="01xxxxxxxxx" required className="pr-10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>كلمة السر</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="pr-10" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-orange-500">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "دخول"}
          </Button>
        </form>
        <div className="text-center text-xs">
          <Link to="/portal/reset" className="text-primary hover:underline">نسيت كلمة السر؟</Link>
        </div>
        <div className="text-center text-xs text-muted-foreground border-t border-border/40 pt-3">
          <Link to="/captain/login" className="hover:text-primary">دخول الكباتن</Link>
          <span className="mx-2">·</span>
          <Link to="/auth" className="hover:text-primary">دخول الإدارة</Link>
        </div>
      </Card>
    </div>
  );
}
