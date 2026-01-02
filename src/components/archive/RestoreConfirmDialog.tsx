import { Subscriber } from '@/types/subscriber';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface RestoreConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  subscriber: Subscriber | null;
}

export const RestoreConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  subscriber,
}: RestoreConfirmDialogProps) => {
  if (!subscriber) return null;

  const hasRemainingAmount = subscriber.remainingAmount > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasRemainingAmount && <AlertCircle className="w-5 h-5 text-destructive" />}
            استعادة المشترك
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            {hasRemainingAmount ? (
              <>
                هل تريد استعادة المشترك <strong>{subscriber.name}</strong>؟
                <br />
                <span className="text-destructive font-medium">
                  ملاحظة: متبقي عليه {subscriber.remainingAmount} جنيه
                </span>
              </>
            ) : (
              <>
                هل تريد استعادة المشترك <strong>{subscriber.name}</strong>؟
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogAction onClick={onConfirm}>نعم، استعادة</AlertDialogAction>
          <AlertDialogCancel onClick={onClose}>لا، إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
