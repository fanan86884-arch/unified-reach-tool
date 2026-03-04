import { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

export const SwipeableItem = ({ children, onDelete, className }: SwipeableItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontal.current) return;

    // Only allow left-to-right swipe (positive dx) for RTL delete
    const clampedDx = Math.max(0, Math.min(dx, 120));
    setOffsetX(clampedDx);
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    if (offsetX > 80) {
      setOffsetX(200);
      setTimeout(onDelete, 200);
    } else {
      setOffsetX(0);
    }
    isHorizontal.current = null;
  }, [offsetX, onDelete]);

  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Delete background */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-start px-4 bg-destructive text-destructive-foreground"
        style={{ width: Math.max(offsetX, 0) }}
      >
        {offsetX > 40 && <Trash2 className="w-5 h-5" />}
      </div>
      {/* Content */}
      <div
        ref={ref}
        className="relative bg-card transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};
