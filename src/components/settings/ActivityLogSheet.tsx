import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { History } from 'lucide-react';
import { ActivityLogComponent } from './ActivityLog';

interface ActivityLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SWIPE_EDGE_SIZE = 40;
const SWIPE_THRESHOLD = 80;

export const ActivityLogSheet = ({ open, onOpenChange }: ActivityLogSheetProps) => {
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;
    const target = e.currentTarget as HTMLDivElement;
    target.dataset.swipeStartX = String(touch.clientX);
    target.dataset.swipeStartY = String(touch.clientY);
    target.dataset.fromRightEdge = touch.clientX >= screenWidth - SWIPE_EDGE_SIZE ? '1' : '0';
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLDivElement;
    if (target.dataset.fromRightEdge !== '1') return;

    const startX = Number(target.dataset.swipeStartX || 0);
    const startY = Number(target.dataset.swipeStartY || 0);
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const deltaX = startX - endX;
    const deltaY = Math.abs(endY - startY);

    if (deltaX > SWIPE_THRESHOLD && deltaX > deltaY) {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-screen max-w-none h-[100dvh] p-0 flex flex-col rounded-none border-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <SheetHeader className="pt-safe-top p-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-right">
            <History className="w-5 h-5 text-primary" />
            سجل التغييرات
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 pb-safe">
          <ActivityLogComponent />
        </div>
      </SheetContent>
    </Sheet>
  );
};
