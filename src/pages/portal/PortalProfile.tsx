import { useNavigate } from "react-router-dom";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { signOutPortal } from "@/lib/portalAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, KeyRound, Phone, User, ChevronLeft } from "lucide-react";

export default function PortalProfile() {
  const session = usePortalSession("client");
  const { data: sub } = useClientSubscriber(session.subscriberId);
  const navigate = useNavigate();

  if (!sub) return null;
  const initial = sub.name.trim().charAt(0);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">حسابي</h1>

      <Card className="p-5 flex flex-col items-center gap-3 bg-gradient-to-br from-primary/10 to-transparent">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-primary-foreground">
          {initial}
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{sub.name}</div>
          <div className="text-xs text-muted-foreground">{sub.phone}</div>
        </div>
      </Card>

      <Card className="divide-y divide-border/50">
        <Row icon={User} label="الاسم" value={sub.name} />
        <Row icon={Phone} label="رقم الموبايل" value={sub.phone} />
      </Card>

      <Card className="divide-y divide-border/50">
        <ActionRow icon={KeyRound} label="إعادة تعيين كلمة السر" onClick={() => navigate("/portal/reset")} />
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => signOutPortal().then(() => navigate("/portal/login", { replace: true }))}
      >
        <LogOut className="h-4 w-4 ml-2" />
        تسجيل الخروج
      </Button>
    </div>
  );
}

const Row = ({ icon: Icon, label, value }: any) => (
  <div className="flex items-center gap-3 p-3">
    <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
    <div className="flex-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  </div>
);
const ActionRow = ({ icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 p-3 active:bg-muted/40 transition">
    <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
    <div className="flex-1 text-right text-sm font-medium">{label}</div>
    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
  </button>
);
