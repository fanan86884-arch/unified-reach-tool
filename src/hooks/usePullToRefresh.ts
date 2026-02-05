 import { useCallback, useState } from 'react';
 
 interface UsePullToRefreshOptions {
   onRefresh: () => Promise<void>;
   threshold?: number;
   maxPull?: number;
 }
 
 export const usePullToRefresh = ({
   onRefresh,
   threshold = 80,
   maxPull = 150,
 }: UsePullToRefreshOptions) => {
   const [pullStartY, setPullStartY] = useState(0);
   const [pullDistance, setPullDistance] = useState(0);
   const [isRefreshing, setIsRefreshing] = useState(false);
 
   const handleTouchStart = useCallback((e: React.TouchEvent, scrollTop: number) => {
     if (scrollTop === 0) {
       setPullStartY(e.touches[0].clientY);
     }
   }, []);
 
   const handleTouchMove = useCallback((e: React.TouchEvent, scrollTop: number) => {
     if (pullStartY > 0 && scrollTop === 0) {
       const currentY = e.touches[0].clientY;
       const distance = currentY - pullStartY;
       if (distance > 0) {
         setPullDistance(Math.min(distance, maxPull));
         e.preventDefault();
       }
     }
   }, [pullStartY, maxPull]);
 
   const handleTouchEnd = useCallback(async () => {
     if (pullDistance > threshold) {
       setIsRefreshing(true);
       try {
         await onRefresh();
       } finally {
         setIsRefreshing(false);
       }
     }
     setPullStartY(0);
     setPullDistance(0);
   }, [pullDistance, threshold, onRefresh]);
 
   return {
     pullDistance,
     isRefreshing,
     handleTouchStart,
     handleTouchMove,
     handleTouchEnd,
   };
 };