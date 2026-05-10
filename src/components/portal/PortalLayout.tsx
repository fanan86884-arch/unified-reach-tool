import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, CreditCard, MessagesSquare, ClipboardList, User, Loader2 } from "lucide-react";
import { usePortalSession } from "@/hooks/usePortalSession";
import { signOutPortal } from "@/lib/portalAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/portal/home", label: "الرئيسية", icon: Home },
  { to: "/portal/subscription", label: "اشتراكي", icon: CreditCard },
  { to: "/portal/chat", label: "الدردشة", icon: MessagesSquare },
  { to: "/portal/requests", label: "طلباتي", icon: ClipboardList },
  { to: "/portal/profile", label: "حسابي", icon: User },
];

export default function PortalLayout() {
  const session = usePortalSession("client");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session.loading) return;
    if (!session.userId) {
      navigate("/portal/login", { replace: true });
      return;
    }
    if (!session.subscriberId) {
      toast({ title: "حسابك غير مفعل", description: "تواصل مع الإدارة", variant: "destructive" });
      signOutPortal().then(() => navigate("/portal/login", { replace: true }));
    }
  }, [session.loading, session.userId, session.subscriberId]);

  if (session.loading || !session.subscriberId) {
    return (
      <div className="portal-theme min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="portal-theme min-h-screen bg-background text-foreground"
      dir="rtl"
      style={{
        // Distinct teal/emerald identity — scoped to client portal only
        ['--primary' as any]: '160 84% 45%',
        ['--primary-foreground' as any]: '0 0% 100%',
        ['--accent' as any]: '170 70% 40%',
        ['--ring' as any]: '160 84% 45%',
        backgroundImage:
          'radial-gradient(1200px 600px at 50% -200px, hsl(160 84% 45% / 0.18), transparent 60%), radial-gradient(800px 400px at 100% 100%, hsl(190 70% 40% / 0.10), transparent 60%)',
      }}
    >
      <main
        className="max-w-md mx-auto px-4 pb-28"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe select-none">
        <div className="absolute inset-0 bg-background/85 backdrop-blur-2xl border-t border-border/40" />
        <div className="relative flex justify-around items-center h-[64px] max-w-md mx-auto px-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 active:scale-90",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn("p-1.5 rounded-2xl transition-all", isActive && "bg-primary/15")}>
                      <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    <span className={cn("text-[10px] mt-0.5", isActive && "font-semibold")}>{t.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
