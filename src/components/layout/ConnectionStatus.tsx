import { useEffect, useMemo, useState } from "react";
import { CloudOff, Cloud, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useLanguage } from "@/i18n/LanguageContext";

export function ConnectionStatus({ className }: { className?: string }) {
  const { isOnline, pendingCount, isSyncing, lastSyncAt } = useOfflineStorage();
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const statusText = useMemo(() => {
    if (isSyncing) return t.connection.syncing;
    if (!isOnline) return t.connection.offline;
    if (pendingCount > 0) return `${t.connection.pending}: ${pendingCount}`;
    return t.connection.synced;
  }, [isOnline, isSyncing, pendingCount, t]);

  const subText = useMemo(() => {
    if (!lastSyncAt) return null;
    const minutes = Math.max(0, Math.round((now - lastSyncAt) / 60_000));
    if (minutes <= 1) return t.connection.lastSyncNow;
    return `${t.connection.lastSyncAgo} ${minutes} ${t.connection.minutes}`;
  }, [lastSyncAt, now, t]);

  const Icon = !isOnline ? CloudOff : Cloud;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs backdrop-blur",
        className
      )}
      aria-label={t.connection.synced}
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
