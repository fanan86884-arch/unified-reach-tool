import { History, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface HeaderProps {
  onOpenActivityLog?: () => void;
  isRefreshing?: boolean;
}

export const Header = ({ onOpenActivityLog, isRefreshing = false }: HeaderProps) => {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const isOnline = useOnlineStatus();

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 dark:bg-[hsl(0_0%_7%)]/95 backdrop-blur-xl pt-safe-top">
        <div className="container flex items-center justify-center h-14 px-4 relative">
          <div className="flex items-center gap-1 absolute left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAIChatOpen(true)}
              className="rounded-full w-10 h-10 bg-primary/10 hover:bg-primary/20 select-none"
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </Button>
          </div>
          <div className="flex items-center select-none">
            <img src={logo} alt="2B GYM Logo" className="w-9 h-9 object-contain drop-shadow-lg pointer-events-none" />
          </div>
          {onOpenActivityLog && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenActivityLog}
              className="rounded-full absolute right-4 w-10 h-10 bg-card/50 hover:bg-card select-none"
            >
              <History className={cn("w-5 h-5 transition-all", isRefreshing && "animate-spin", isOnline ? "text-yellow-500" : "text-destructive")} />
            </Button>
          )}
        </div>
      </header>
      <AIChatInterface open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
    </>
  );
};