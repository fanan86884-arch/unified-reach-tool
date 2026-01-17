import { Moon, Sun, History, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { AIChatInterface } from '@/components/ai/AIChatInterface';

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
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-center h-14 px-4 relative">
          <div className="flex items-center gap-1 absolute left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="rounded-full w-8 h-8"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAIChatOpen(true)}
              className="rounded-full w-8 h-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="2B GYM Logo" className="w-9 h-9 object-contain" />
            <h1 className="text-lg font-bold text-foreground">2B GYM</h1>
          </div>
          {onOpenActivityLog && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenActivityLog}
              className="rounded-full absolute right-4"
            >
              <History 
                className={cn(
                  "w-5 h-5 transition-all",
                  isRefreshing && "animate-spin",
                  isOnline ? "text-green-500" : "text-destructive"
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