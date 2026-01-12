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
          "fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full",
          "bg-gradient-to-br from-primary to-primary/80",
          "flex items-center justify-center",
          "shadow-md shadow-primary/20",
          "hover:scale-105 active:scale-95",
          "transition-all duration-300"
        )}
      >
        <Sparkles className="w-4 h-4 text-primary-foreground" />
      </button>

      {/* AI Chat Interface */}
      <AIChatInterface open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
