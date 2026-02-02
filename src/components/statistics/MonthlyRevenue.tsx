import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Subscriber } from '@/types/subscriber';
import { TrendingUp, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { parseISO, getMonth, getYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthlyRevenueProps {
  allSubscribers: Subscriber[];
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const MonthlyRevenue = ({ allSubscribers }: MonthlyRevenueProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentYear = new Date().getFullYear();

  // Calculate monthly revenues (paidAmount - remainingAmount) based on createdAt date
  const monthlyData = useMemo(() => {
    const monthlyRevenues: number[] = Array(12).fill(0);
    
    allSubscribers.forEach(sub => {
      if (!sub.createdAt) return;
      
      const createdDate = parseISO(sub.createdAt);
      const subYear = getYear(createdDate);
      const subMonth = getMonth(createdDate);
      
      // Only count current year
      if (subYear === currentYear) {
        // Revenue = paidAmount - remainingAmount (net revenue)
        const netRevenue = sub.paidAmount - sub.remainingAmount;
        monthlyRevenues[subMonth] += Math.max(0, netRevenue);
      }
    });

    return monthlyRevenues;
  }, [allSubscribers, currentYear]);

  const totalRevenue = useMemo(() => 
    monthlyData.reduce((sum, val) => sum + val, 0), 
    [monthlyData]
  );

  const currentMonth = new Date().getMonth();
  const currentMonthRevenue = monthlyData[currentMonth];

  // Find max for visual scaling
  const maxRevenue = Math.max(...monthlyData, 1);

  return (
    <Card className="p-4 card-shadow overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-sm">الإيرادات الشهرية</h3>
            <p className="text-xs text-muted-foreground">{currentYear}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-xl font-bold text-primary">{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">جنيه إجمالي</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Current month highlight */}
      {!isExpanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              إيراد {MONTH_NAMES[currentMonth]}
            </span>
            <span className="font-bold text-primary">
              {currentMonthRevenue.toLocaleString()} جنيه
            </span>
          </div>
        </div>
      )}

      {/* Expanded view - All months */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {monthlyData.map((revenue, index) => {
            const isCurrentMonth = index === currentMonth;
            const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
            
            return (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors",
                  isCurrentMonth && "bg-primary/5"
                )}
              >
                <span className={cn(
                  "w-16 text-sm",
                  isCurrentMonth ? "font-bold text-primary" : "text-muted-foreground"
                )}>
                  {MONTH_NAMES[index]}
                </span>
                
                {/* Progress bar */}
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCurrentMonth 
                        ? "bg-gradient-to-l from-primary to-primary/70" 
                        : "bg-primary/40"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <span className={cn(
                  "w-20 text-left text-sm",
                  isCurrentMonth ? "font-bold" : "text-muted-foreground"
                )}>
                  {revenue.toLocaleString()} ج
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
