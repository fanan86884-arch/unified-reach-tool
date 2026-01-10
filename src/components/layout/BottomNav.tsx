import { Users, Archive, BarChart3, Settings, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddSubscriber?: () => void;
}

export const BottomNav = ({ activeTab, onTabChange, onAddSubscriber }: BottomNavProps) => {
  const tabs = [
    { id: 'subscribers', label: 'المشتركين', icon: Users },
    { id: 'statistics', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'archive', label: 'الأرشيف', icon: Archive },
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
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 mb-1 transition-transform duration-200',
                  isActive && 'scale-110'
                )}
              />
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
