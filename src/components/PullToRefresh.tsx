import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  pullDistance: number;
  isRefreshing: boolean;
}

export const PullToRefresh = ({ pullDistance, isRefreshing }: PullToRefreshProps) => {
  const threshold = 80;
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 flex justify-center z-50 transition-transform duration-200"
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.5, 60)}px)`,
      }}
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg ${
          isRefreshing ? 'animate-spin' : ''
        }`}
        style={{
          opacity: progress,
          transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)`,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 ${shouldTrigger || isRefreshing ? 'text-primary' : 'text-muted-foreground'}`}
        />
      </div>
    </div>
  );
};
