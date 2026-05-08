import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client.runtime";

export type PortalRole = "client" | "captain" | null;

interface PortalState {
  loading: boolean;
  userId: string | null;
  role: PortalRole;
  subscriberId: string | null;
  captainName: string | null;
}

export const usePortalSession = (expected: "client" | "captain") => {
  const [state, setState] = useState<PortalState>({
    loading: true,
    userId: null,
    role: null,
    subscriberId: null,
    captainName: null,
  });

  useEffect(() => {
    let cancelled = false;

    const resolve = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) setState({ loading: false, userId: null, role: null, subscriberId: null, captainName: null });
        return;
      }
      if (expected === "client") {
        const { data } = await supabase.from("client_accounts").select("subscriber_id").eq("user_id", userId).maybeSingle();
        if (cancelled) return;
        setState({
          loading: false,
          userId,
          role: data ? "client" : null,
          subscriberId: data?.subscriber_id ?? null,
          captainName: null,
        });
      } else {
        const { data } = await supabase.from("captain_accounts").select("captain_name").eq("user_id", userId).maybeSingle();
        if (cancelled) return;
        setState({
          loading: false,
          userId,
          role: data ? "captain" : null,
          subscriberId: null,
          captainName: data?.captain_name ?? null,
        });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      resolve(session?.user?.id ?? null);
    });

    supabase.auth.getSession().then(({ data }) => resolve(data.session?.user?.id ?? null));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [expected]);

  return state;
};
