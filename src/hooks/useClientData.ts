import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";

export interface ClientSubscriber {
  id: string;
  name: string;
  phone: string;
  subscription_type: string;
  start_date: string;
  end_date: string;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  is_paused: boolean;
  paused_until: string | null;
  captain: string;
}

export const useClientSubscriber = (subscriberId: string | null) => {
  const [data, setData] = useState<ClientSubscriber | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!subscriberId) return;
    setLoading(true);
    const { data: row } = await supabase.from("subscribers").select("*").eq("id", subscriberId).maybeSingle();
    setData(row as any);
    setLoading(false);
  }, [subscriberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
};
