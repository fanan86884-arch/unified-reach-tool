import { useMemo, useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Subscriber } from '@/types/subscriber';
import { TrendingUp, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { parseISO, getMonth, getYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthlyRevenueProps {
  allSubscribers: Subscriber[];
}

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const PASSCODE = '8908';

export const MonthlyRevenue = ({ allSubscribers }: MonthlyRevenueProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);
  const [passcodeValue, setPasscodeValue] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentYear = new Date().getFullYear();

  const monthlyData = useMemo(() => {
    const monthlyRevenues: number[] = Array(12).fill(0);
    allSubscribers.forEach(sub => {
      if (!sub.startDate) return;
      const startDate = parseISO(sub.startDate);
      const subYear = getYear(startDate);
      const subMonth = getMonth(startDate);
      if (subYear === currentYear) {
        monthlyRevenues[subMonth] += sub.paidAmount;
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
  const maxRevenue = Math.max(...monthlyData, 1);

  const handleEyeClick = useCallback(() => {
    if (isRevealed) {
      setIsRevealed(false);
    }
  }, [isRevealed]);

  const handleLongPressStart = useCallback(() => {
    if (isRevealed) return;
    longPressTimer.current = setTimeout(() => {
      setShowPasscodeInput(true);
      setPasscodeValue('');
      setPasscodeError(false);
    }, 600);
  }, [isRevealed]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePasscodeSubmit = useCallback(() => {
    if (passcodeValue === PASSCODE) {
      setIsRevealed(true);
      setShowPasscodeInput(false);
      setPasscodeValue('');
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
      setPasscodeValue('');
    }
  }, [passcodeValue]);

  const renderValue = (value: number, suffix: string = '') => {
    if (!isRevealed) return <span className="tracking-wider select-none">••••</span>;
    return <>{value.toLocaleString()}{suffix && ` ${suffix}`}</>;
  };

  return (
    <Card className="p-4 card-shadow overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-sm">الإيرادات الشهرية</h3>
            <p className="text-xs text-muted-foreground">{currentYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-xl font-bold text-primary">{renderValue(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">جنيه إجمالي</p>
          </div>
          {/* Eye button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleEyeClick(); }}
            onMouseDown={(e) => { e.stopPropagation(); handleLongPressStart(); }}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={(e) => { e.stopPropagation(); handleLongPressStart(); }}
            onTouchEnd={handleLongPressEnd}
            onTouchCancel={handleLongPressEnd}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors active:scale-95"
          >
            {isRevealed ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          </button>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </button>

      {/* Passcode input overlay */}
      {showPasscodeInput && (
        <div className="mt-4 pt-4 border-t border-border animate-fade-in">
          <div className="flex items-center gap-3 justify-center">
            <p className="text-sm font-medium text-muted-foreground">أدخل الرمز:</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={passcodeValue}
              onChange={(e) => {
                setPasscodeError(false);
                setPasscodeValue(e.target.value.replace(/\D/g, ''));
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasscodeSubmit()}
              className={cn(
                "w-24 h-10 text-center text-lg font-bold rounded-xl border-2 bg-muted/50 backdrop-blur-sm outline-none transition-all",
                passcodeError ? "border-destructive animate-shake" : "border-border focus:border-primary"
              )}
              autoFocus
            />
            <button
              type="button"
              onClick={handlePasscodeSubmit}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
            >
              تأكيد
            </button>
            <button
              type="button"
              onClick={() => setShowPasscodeInput(false)}
              className="h-10 px-3 rounded-xl bg-muted text-muted-foreground text-sm active:scale-95 transition-transform"
            >
              إلغاء
            </button>
          </div>
          {passcodeError && (
            <p className="text-xs text-destructive text-center mt-2 animate-fade-in">رمز خاطئ</p>
          )}
        </div>
      )}

      {!isExpanded && !showPasscodeInput && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">إيراد {MONTH_NAMES[currentMonth]}</span>
            <span className="font-bold text-primary">{renderValue(currentMonthRevenue, 'جنيه')}</span>
          </div>
        </div>
      )}

      {isExpanded && !showPasscodeInput && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {monthlyData.map((revenue, index) => {
            const isCurrentMonth = index === currentMonth;
            const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
            return (
              <div key={index} className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-all duration-300",
                isCurrentMonth && "bg-primary/5"
              )}>
                <span className={cn("w-14 text-xs", isCurrentMonth ? "font-bold text-primary" : "text-muted-foreground")}>{MONTH_NAMES[index]}</span>
                <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    isCurrentMonth ? "bg-gradient-to-l from-primary to-primary/70" : "bg-primary/30"
                  )}
                    style={{ width: `${percentage}%` }} />
                </div>
                <span className={cn("w-16 text-left text-xs", isCurrentMonth ? "font-bold" : "text-muted-foreground")}>
                  {renderValue(revenue, 'ج')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
