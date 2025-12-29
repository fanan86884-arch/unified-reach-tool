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
        'p-4 border card-shadow hover:card-shadow-hover transition-all duration-300 animate-slide-up',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            iconBgStyles[variant]
          )}
        >
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-3xl font-bold">{count}</span>
      </div>
      <h3 className="font-medium mb-3">{title}</h3>
      <Button
        variant="whatsapp"
        size="sm"
        className="w-full"
        onClick={onSendAll}
        disabled={count === 0}
      >
        <MessageCircle className="w-4 h-4" />
        {buttonLabel}
      </Button>
    </Card>
  );
};
