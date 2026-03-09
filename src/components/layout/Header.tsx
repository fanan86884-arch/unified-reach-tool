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
      <header className="sticky top-0 z-40 pt-safe-top">
        {/* Frosted glass background */}
        <div className="absolute inset-0 bg-background/80 dark:bg-[hsl(0_0%_4%)]/85 backdrop-blur-2xl" />
        
        <div className="relative container flex items-center justify-center h-12 px-4">
          <div className="flex items-center gap-1 absolute left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAIChatOpen(true)}
              className="rounded-full w-9 h-9 bg-primary/10 hover:bg-primary/20 active:scale-90 active:opacity-70 transition-all duration-150 select-none"
            >
              <Sparkles className="w-[18px] h-[18px] text-primary" />
            </Button>
          </div>
          <div className="flex items-center select-none">
            <img src={logo} alt="2B GYM Logo" className="w-8 h-8 object-contain drop-shadow-lg pointer-events-none" />
          </div>
          {onOpenActivityLog && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenActivityLog}
              className="rounded-full absolute right-4 w-9 h-9 bg-card/50 hover:bg-card active:scale-90 active:opacity-70 transition-all duration-150 select-none"
            >
              <History className={cn("w-[18px] h-[18px] transition-all", isRefreshing && "animate-spin", isOnline ? "text-primary" : "text-destructive")} />
            </Button>
          )}
        </div>
      </header>
      <AIChatInterface open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
    </>
  );
};