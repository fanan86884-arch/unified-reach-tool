import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Users } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 select-none"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 50% -200px, hsl(var(--primary) / 0.18), transparent 60%)",
      }}
    >
      <img src={logo} alt="2B GYM" className="w-24 h-24 mb-6 drop-shadow-2xl" />
      <h1 className="text-2xl font-bold mb-2">أهلاً بك في 2B GYM</h1>
      <p className="text-sm text-muted-foreground mb-10">اختر طريقة الدخول</p>

      <div className="w-full max-w-sm space-y-3">
        <Button
          size="lg"
          className="w-full h-14 text-base rounded-2xl"
          onClick={() => navigate("/portal/login")}
        >
          <User className="w-5 h-5 ml-2" />
          دخول كعميل
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full h-14 text-base rounded-2xl"
          onClick={() => navigate("/auth")}
        >
          <Users className="w-5 h-5 ml-2" />
          دخول كموظف
        </Button>
      </div>
    </div>
  );
}
