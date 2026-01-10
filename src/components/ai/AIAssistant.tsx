import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Bell, Loader2 } from 'lucide-react';
import { Notifications } from '@/components/notifications/Notifications';
import { AIDietGenerator } from './AIDietGenerator';
import { Subscriber } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AIAssistantProps {
  stats: {
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
  };
}

export const AIAssistant = ({ stats }: AIAssistantProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [requestsCount, setRequestsCount] = useState(0);
  const [dietRequestsCount, setDietRequestsCount] = useState(0);
  const { user } = useAuth();

  // Calculate total notifications
  const subscriptionNotifs = stats.expiring.length + stats.expired.length + stats.pending.length;
  const totalNotifs = subscriptionNotifs + requestsCount + dietRequestsCount;

  // Fetch pending requests count
  useEffect(() => {
    const fetchCounts = async () => {
      const [subReqs, dietReqs] = await Promise.all([
        supabase.from('subscription_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('diet_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]);
      
      setRequestsCount(subReqs.count || 0);
      setDietRequestsCount(dietReqs.count || 0);
    };

    fetchCounts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('requests_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_requests' }, fetchCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full relative"
        >
          <Sparkles className="w-5 h-5 text-primary" />
          {totalNotifs > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {totalNotifs > 99 ? '99+' : totalNotifs}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-right">
            <Sparkles className="w-5 h-5 text-primary" />
            المساعد الذكي
          </SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2 mx-4 mt-4">
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
          
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="notifications" className="m-0 p-4">
              <Notifications stats={stats} />
            </TabsContent>
            
            <TabsContent value="diet" className="m-0 p-4">
              <AIDietGenerator />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
