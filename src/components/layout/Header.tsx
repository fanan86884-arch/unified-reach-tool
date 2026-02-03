import { Moon, Sun, History, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import { ConnectionStatus } from '@/components/layout/ConnectionStatus';

interface HeaderProps {
  onOpenActivityLog?: () => void;
  isRefreshing?: boolean;
}

export const Header = ({ onOpenActivityLog, isRefreshing = false }: HeaderProps) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-center h-14 px-4 relative">
          <div className="flex items-center gap-1 absolute left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="rounded-full w-10 h-10 bg-card/50 hover:bg-card"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAIChatOpen(true)}
              className="rounded-full w-10 h-10 bg-primary/10 hover:bg-primary/20"
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="2B GYM Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-black tracking-tight text-foreground leading-none">2B GYM</h1>
              <ConnectionStatus className="mt-1" />
            </div>
          </div>
          {onOpenActivityLog && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenActivityLog}
              className="rounded-full absolute right-4 w-10 h-10 bg-card/50 hover:bg-card"
            >
              <History 
                className={cn(
                  "w-5 h-5 transition-all",
                  isRefreshing && "animate-spin",
                  isOnline ? "text-success" : "text-destructive"
                )} 
              />
            </Button>
          )}
        </div>
      </header>
      <AIChatInterface open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
    </>
  );
};