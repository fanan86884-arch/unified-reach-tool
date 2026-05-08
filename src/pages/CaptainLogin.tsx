import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInCaptain } from "@/lib/portalAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock } from "lucide-react";

export default function CaptainLogin() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInCaptain(loginId, password);
    setLoading(false);
    if (error) {
      toast({ title: "تعذر تسجيل الدخول", description: error.message === "Invalid login credentials" ? "اسم الدخول أو كلمة السر غير صحيحة" : error.message, variant: "destructive" });
      return;
    }
    navigate("/captain");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-sm p-6 space-y-5 border-border/50">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">بوابة الكابتن</h1>
          <p className="text-sm text-muted-foreground">تابع عملاءك واكتب ملاحظاتك</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>اسم الدخول</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={loginId} onChange={(e) => setLoginId(e.target.value)} required className="pr-10" placeholder="مثال: mohamed" />
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
        <div className="text-center text-xs text-muted-foreground">
          <Link to="/portal/login" className="hover:text-primary">دخول العملاء</Link>
        </div>
      </Card>
    </div>
  );
}
