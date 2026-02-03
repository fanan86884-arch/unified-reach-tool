import { useEffect, useMemo, useState } from "react";
import { CloudOff, Cloud, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

export function ConnectionStatus({ className }: { className?: string }) {
  const { isOnline, pendingCount, isSyncing, lastSyncAt } = useOfflineStorage();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const statusText = useMemo(() => {
    if (isSyncing) return "جاري المزامنة";
    if (!isOnline) return "غير متصل";
    if (pendingCount > 0) return `معلّق: ${pendingCount}`;
    return "مزامن";
  }, [isOnline, isSyncing, pendingCount]);

  const subText = useMemo(() => {
    if (!lastSyncAt) return null;
    const minutes = Math.max(0, Math.round((now - lastSyncAt) / 60_000));
    if (minutes <= 1) return "آخر مزامنة الآن";
    return `آخر مزامنة منذ ${minutes} د`;
  }, [lastSyncAt, now]);

  const Icon = !isOnline ? CloudOff : Cloud;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs backdrop-blur",
        className
      )}
      aria-label="حالة الاتصال والمزامنة"
    >
      {isSyncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Icon className={cn("h-3.5 w-3.5", isOnline ? "text-foreground" : "text-muted-foreground")} />
      )}
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-foreground">{statusText}</span>
        {subText && <span className="text-[10px] text-muted-foreground">{subText}</span>}
      </div>
    </div>
  );
}
