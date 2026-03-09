import { Users, Bell, BarChart3, Settings, UserPlus, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { hapticFeedback } from '@/lib/haptics';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddSubscriber?: () => void;
  notificationCount?: number;
}

export const BottomNav = ({ 
  activeTab, 
  onTabChange, 
  onAddSubscriber,
  notificationCount = 0
}: BottomNavProps) => {
  const { t } = useLanguage();

  const tabs = [
    { id: 'subscribers', label: t.nav.subscribers, icon: Users },
    { id: 'statistics', label: t.nav.statistics, icon: BarChart3 },
    { id: 'archive', label: t.nav.archive, icon: Archive },
    { id: 'notifications', label: t.nav.notifications, icon: Bell, showBadge: true },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe select-none">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-background/80 dark:bg-[hsl(0_0%_4%)]/85 backdrop-blur-2xl border-t border-border/40" />
      
      <div className="relative flex justify-around items-center h-[60px] max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isSubscribersTabActive = tab.id === 'subscribers' && activeTab === 'subscribers';
          
          const Icon = isSubscribersTabActive ? UserPlus : tab.icon;
          const label = isSubscribersTabActive ? t.nav.register : tab.label;
          
          const handleClick = () => {
            hapticFeedback('light');
            if (isSubscribersTabActive && onAddSubscriber) {
              onAddSubscriber();
            } else {
              onTabChange(tab.id);
            }
          };

          return (
            <button
              key={tab.id}
              onClick={handleClick}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative select-none active:scale-90 active:opacity-70',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <div className={cn(
                  "p-1.5 rounded-2xl transition-all duration-300",
                  isActive && "bg-primary/12"
                )}>
                  <Icon
                    className={cn(
                      'w-[22px] h-[22px] transition-all duration-300',
                      isActive && 'scale-105'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                {tab.showBadge && notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 transition-all duration-200 leading-tight",
                isActive ? "font-semibold text-primary" : "font-normal"
              )}>{label}</span>
              
              {/* Active indicator dot */}
              <div className={cn(
                "absolute bottom-1 w-1 h-1 rounded-full bg-primary transition-all duration-300",
                isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
              )} />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
