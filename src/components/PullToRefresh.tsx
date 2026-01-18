interface PullToRefreshProps {
  pullDistance: number;
  isRefreshing: boolean;
}

// Hidden pull-to-refresh - triggers refresh without visual indicator
export const PullToRefresh = ({ pullDistance, isRefreshing }: PullToRefreshProps) => {
  // No visual indicator - refresh happens silently
  return null;
};
