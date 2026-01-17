import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { History } from 'lucide-react';
import { ActivityLogComponent } from './ActivityLog';

interface ActivityLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActivityLogSheet = ({ open, onOpenChange }: ActivityLogSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-right">
            <History className="w-5 h-5 text-primary" />
            سجل التغييرات
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-4">
          <ActivityLogComponent />
        </div>
      </SheetContent>
    </Sheet>
  );
};
