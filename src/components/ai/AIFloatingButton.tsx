import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChatInterface } from './AIChatInterface';

export const AIFloatingButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full",
          "bg-gradient-to-br from-primary to-primary/80",
          "flex items-center justify-center",
          "shadow-lg shadow-primary/30",
          "hover:scale-110 active:scale-95",
          "transition-all duration-300",
          "animate-pulse hover:animate-none"
        )}
      >
        <Sparkles className="w-6 h-6 text-primary-foreground" />
      </button>

      {/* AI Chat Interface */}
      <AIChatInterface open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
