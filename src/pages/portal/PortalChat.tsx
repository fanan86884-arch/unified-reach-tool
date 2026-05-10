import { usePortalSession } from "@/hooks/usePortalSession";
import { useClientSubscriber } from "@/hooks/useClientData";
import { ChatThread } from "@/components/portal/ChatThread";
import { Loader2 } from "lucide-react";

export default function PortalChat() {
  const session = usePortalSession("client");
  const { data: sub } = useClientSubscriber(session.subscriberId);

  if (!sub || !session.userId) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold">دردشة مع الكابتن</h1>
        <p className="text-xs text-muted-foreground mt-1">{sub.captain}</p>
      </div>
      <ChatThread subscriberId={sub.id} myUserId={session.userId} myRole="client" className="min-h-[70vh]" />
    </div>
  );
}
