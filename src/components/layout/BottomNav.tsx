import { Users, Bell, BarChart3, Settings, UserPlus, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const tabs = [
    { id: 'subscribers', label: 'المشتركين', icon: Users },
    { id: 'statistics', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'archive', label: 'الأرشيف', icon: Archive },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, showBadge: true },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 z-50 pb-safe select-none">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isSubscribersTabActive = tab.id === 'subscribers' && activeTab === 'subscribers';
          
          // Dynamic icon and label for subscribers tab
          const Icon = isSubscribersTabActive ? UserPlus : tab.icon;
          const label = isSubscribersTabActive ? 'التسجيل' : tab.label;
          
          const handleClick = () => {
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
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative rounded-2xl mx-0.5 select-none',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground active:scale-95'
              )}
            >
              <div className={cn(
                "relative p-2 rounded-2xl transition-all duration-300",
                isActive && "bg-primary/15"
              )}>
                <Icon
                  className={cn(
                    'w-6 h-6 transition-all duration-300',
                    isActive && 'scale-110'
                  )}
                />
                {tab.showBadge && notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-all",
                isActive && "font-bold"
              )}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
