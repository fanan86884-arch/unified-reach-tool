import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  variant: 'success' | 'warning' | 'destructive' | 'accent' | 'primary' | 'muted';
  onSendAll: () => void;
  buttonLabel?: string;
}

const variantStyles = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  muted: 'bg-muted/50 text-muted-foreground border-muted',
};

const iconBgStyles = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  accent: 'bg-accent',
  primary: 'bg-primary',
  muted: 'bg-muted-foreground',
};

export const StatCard = ({ title, count, icon: Icon, variant, onSendAll, buttonLabel = 'إرسال للكل' }: StatCardProps) => {
  return (
    <Card
      className={cn(
        'p-4 border-2 hover:scale-[1.02] transition-all duration-300 animate-slide-up overflow-hidden relative',
        variantStyles[variant]
      )}
    >
      {/* Decorative gradient blob */}
      <div className={cn(
        "absolute -top-8 -left-8 w-20 h-20 rounded-full blur-2xl opacity-30",
        iconBgStyles[variant]
      )} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg',
              iconBgStyles[variant]
            )}
          >
            <Icon className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-4xl font-black">{count}</span>
        </div>
        <h3 className="font-bold text-sm mb-3">{title}</h3>
        <Button
          variant="whatsapp"
          size="sm"
          className="w-full rounded-xl font-bold"
          onClick={onSendAll}
          disabled={count === 0}
        >
          <MessageCircle className="w-4 h-4" />
          {buttonLabel}
        </Button>
      </div>
    </Card>
  );
};
