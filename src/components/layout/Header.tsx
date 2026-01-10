import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import logo from '@/assets/logo.png';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { Subscriber } from '@/types/subscriber';

interface HeaderProps {
  stats?: {
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
  };
}

export const Header = ({ stats }: HeaderProps) => {
  const [isDark, setIsDark] = useState(() => {
    // الوضع الليلي هو الافتراضي
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

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

  const defaultStats = { expiring: [], expired: [], pending: [] };

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
        <div className="absolute right-4">
          <AIAssistant stats={stats || defaultStats} />
        </div>
      </div>
    </header>
  );
};
