import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, LogOut } from "lucide-react";
import { signOutPortal } from "@/lib/portalAuth";
import logo from "@/assets/logo.png";

const titles: Record<string, string> = {
  "/portal/home": "الرئيسية",
  "/portal/subscription": "اشتراكي",
  "/portal/chat": "الدردشة",
  "/portal/requests": "طلباتي",
  "/portal/profile": "حسابي",
  "/portal/notifications": "الإشعارات",
  "/portal/reset": "إعادة تعيين كلمة السر",
};

export const PortalHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const title = titles[location.pathname] || "البوابة";
  const isHome = location.pathname === "/portal/home";

  const handleBack = async () => {
    if (isHome) {
      await signOutPortal();
      try { sessionStorage.removeItem("hasLoaded"); } catch {}
      window.location.replace("/welcome");
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className="sticky top-0 z-40 -mx-4 px-4 mb-3"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-2xl border-b border-border/40" />
      <div className="relative flex items-center justify-between h-12">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-1 py-1.5 active:scale-90 transition select-none"
          aria-label={isHome ? "تسجيل الخروج" : "رجوع"}
        >
          {isHome ? <LogOut className="h-5 w-5 text-destructive" /> : <ChevronRight className="h-5 w-5" />}
          <span className="text-xs font-medium">{isHome ? "خروج" : "رجوع"}</span>
        </button>

        <h1 className="text-sm font-bold absolute left-1/2 -translate-x-1/2">{title}</h1>

        <img src={logo} alt="logo" className="w-8 h-8 object-contain pointer-events-none select-none" />
      </div>
    </header>
  );
};
