import { Moon, Sun, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

interface HeaderProps {
  onOpenActivityLog?: () => void;
  isRefreshing?: boolean;
}

export const Header = ({ onOpenActivityLog, isRefreshing = false }: HeaderProps) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
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
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-center h-14 px-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDark(!isDark)}
          className="rounded-full absolute left-4"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
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
  );
};
