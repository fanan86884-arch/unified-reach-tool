import { useState } from "react";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { ChatThread } from "@/components/portal/ChatThread";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Salad, Dumbbell, Plus, MessageCircle } from "lucide-react";
import { DietRequestForm } from "@/components/auth/DietRequestForm";
import { WorkoutRequestForm } from "@/components/auth/WorkoutRequestForm";
import { supabase } from "@/integrations/supabase/client.runtime";

export default function PortalChat() {
  const session = usePortalSession("client");
  const { data: sub } = useClientSubscriber(session.subscriberId);
  const [openDiet, setOpenDiet] = useState(false);
  const [openWorkout, setOpenWorkout] = useState(false);

  if (!sub || !session.userId) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const sendSystemNote = async (text: string) => {
    await supabase.from("client_chat_messages").insert({
      subscriber_id: sub.id,
      sender_role: "client",
      sender_user_id: session.userId,
      content: text,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            دردشة مع الكابتن
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{sub.captain}</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="text-xs">طلب</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-1" dir="rtl">
            <button
              onClick={() => setOpenDiet(true)}
              className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-accent text-right"
            >
              <Salad className="h-4 w-4 text-green-500" />
              طلب نظام غذائي
            </button>
            <button
              onClick={() => setOpenWorkout(true)}
              className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-accent text-right"
            >
              <Dumbbell className="h-4 w-4 text-orange-500" />
              طلب جدول تمرين
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <ChatThread subscriberId={sub.id} myUserId={session.userId} myRole="client" className="min-h-[68vh]" />

      <Sheet open={openDiet} onOpenChange={setOpenDiet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>طلب نظام غذائي</SheetTitle></SheetHeader>
          <div className="mt-4">
            <DietRequestForm
              phone={sub.phone}
              name={sub.name}
              onSuccess={() => {
                setOpenDiet(false);
                void sendSystemNote("📋 أرسلت طلب نظام غذائي جديد");
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openWorkout} onOpenChange={setOpenWorkout}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>طلب جدول تمرين</SheetTitle></SheetHeader>
          <div className="mt-4">
            <WorkoutRequestForm
              phone={sub.phone}
              name={sub.name}
              onSuccess={() => {
                setOpenWorkout(false);
                void sendSystemNote("🏋️ أرسلت طلب جدول تمرين جديد");
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
