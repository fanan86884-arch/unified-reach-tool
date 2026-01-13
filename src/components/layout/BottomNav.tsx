import { Users, Bell, BarChart3, Settings, UserPlus } from 'lucide-react';
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
    { id: 'notifications', label: 'الإشعارات', icon: Bell, showBadge: true },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border card-shadow z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
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
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 mb-1 transition-transform duration-200',
                    isActive && 'scale-110'
                  )}
                />
                {tab.showBadge && notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
