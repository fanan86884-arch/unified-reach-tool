import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notifications } from '@/components/notifications/Notifications';
import { AIDietGenerator } from './AIDietGenerator';
import { Subscriber } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client.runtime';

interface AIAssistantProps {
  stats: {
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SWIPE_EDGE_SIZE = 40;
const SWIPE_THRESHOLD = 80;

export const AIAssistant = ({ stats, open, onOpenChange }: AIAssistantProps) => {
  const [activeTab, setActiveTab] = useState('notifications');

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;
    const target = e.currentTarget as HTMLDivElement;
    target.dataset.swipeStartX = String(touch.clientX);
    target.dataset.swipeStartY = String(touch.clientY);
    target.dataset.fromRightEdge = touch.clientX >= screenWidth - SWIPE_EDGE_SIZE ? '1' : '0';
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLDivElement;
    if (target.dataset.fromRightEdge !== '1') return;
    const startX = Number(target.dataset.swipeStartX || 0);
    const startY = Number(target.dataset.swipeStartY || 0);
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = startX - endX;
    const deltaY = Math.abs(endY - startY);
    if (deltaX > SWIPE_THRESHOLD && deltaX > deltaY) {
      onOpenChange(false);
    }
  };
  const [requestsCount, setRequestsCount] = useState(0);
  const [dietRequestsCount, setDietRequestsCount] = useState(0);
  const [workoutRequestsCount, setWorkoutRequestsCount] = useState(0);

  const subscriptionNotifs = stats.expiring.length + stats.expired.length + stats.pending.length;
  const totalNotifs = subscriptionNotifs + requestsCount + dietRequestsCount + workoutRequestsCount;

  useEffect(() => {
    const fetchCounts = async () => {
      const [subReqs, dietReqs, workoutReqs] = await Promise.all([
        supabase.from('subscription_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('diet_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('workout_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]);
      
      setRequestsCount(subReqs.count || 0);
      setDietRequestsCount(dietReqs.count || 0);
      setWorkoutRequestsCount(workoutReqs.count || 0);
    };

    fetchCounts();

    const channel = supabase
      .channel('requests_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_requests' }, fetchCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-screen max-w-none h-[100dvh] p-0 flex flex-col rounded-none border-0 [&>button]:hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <SheetHeader className="pt-safe-top p-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-right">
              <Sparkles className="w-5 h-5 text-primary" />
              المساعد الذكي
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted text-muted-foreground"
            >
              ✕
            </button>
          </SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 mx-4 mt-4 shrink-0">
            <TabsTrigger value="notifications" className="relative">
              <Bell className="w-4 h-4 ml-2" />
              الإشعارات
              {totalNotifs > 0 && (
                <Badge variant="secondary" className="mr-2 h-5 min-w-5">
                  {totalNotifs}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="diet">
              <Sparkles className="w-4 h-4 ml-2" />
              مولد الأنظمة
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 min-h-0">
            <TabsContent value="notifications" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 pb-20">
                  <Notifications stats={stats} />
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="diet" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 pb-20">
                  <AIDietGenerator />
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export const useNotificationCount = (stats: { expiring: Subscriber[]; expired: Subscriber[]; pending: Subscriber[] }) => {
  const [requestsCount, setRequestsCount] = useState(0);
  const [dietRequestsCount, setDietRequestsCount] = useState(0);
  const [workoutRequestsCount, setWorkoutRequestsCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const [subReqs, dietReqs, workoutReqs] = await Promise.all([
        supabase.from('subscription_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('diet_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('workout_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]);
      
      setRequestsCount(subReqs.count || 0);
      setDietRequestsCount(dietReqs.count || 0);
      setWorkoutRequestsCount(workoutReqs.count || 0);
    };

    fetchCounts();

    const channel = supabase
      .channel('requests_count_hook')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_requests' }, fetchCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subscriptionNotifs = stats.expiring.length + stats.expired.length + stats.pending.length;
  return subscriptionNotifs + requestsCount + dietRequestsCount + workoutRequestsCount;
};
