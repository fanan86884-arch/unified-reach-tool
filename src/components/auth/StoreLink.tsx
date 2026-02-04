import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.runtime';

export const StoreLink = () => {
  const [storeUrl, setStoreUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreUrl = async () => {
      try {
        const { data } = await supabase
          .from('contact_settings')
          .select('store_url')
          .limit(1)
          .maybeSingle();

        if (data?.store_url) {
          setStoreUrl(data.store_url);
        }
      } catch (e) {
        console.error('Error fetching store URL:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreUrl();

    // Realtime subscription
    const channel = supabase
      .channel('store-url-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_settings',
        },
        () => {
          fetchStoreUrl();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || !storeUrl) {
    return null;
  }

  return (
    <Button
      variant="outline"
      className="w-full h-14 text-lg gap-3"
      onClick={() => window.open(storeUrl, '_blank')}
    >
      <ShoppingBag className="w-5 h-5" />
      2B Store
      <ExternalLink className="w-4 h-4 mr-auto" />
    </Button>
  );
};