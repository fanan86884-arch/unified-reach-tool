import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { SplashScreen } from "@/components/SplashScreen";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import CustomerLookup from "./pages/CustomerLookup";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import ClientLogin from "./pages/ClientLogin";
import ClientResetPassword from "./pages/ClientResetPassword";
import PortalLayout from "./components/portal/PortalLayout";
import PortalHome from "./pages/portal/PortalHome";
import PortalSubscription from "./pages/portal/PortalSubscription";
import PortalChat from "./pages/portal/PortalChat";
import PortalRequests from "./pages/portal/PortalRequests";
import PortalProfile from "./pages/portal/PortalProfile";
import PortalNotifications from "./pages/portal/PortalNotifications";
import CaptainLogin from "./pages/CaptainLogin";
import CaptainDashboard from "./pages/CaptainDashboard";
import CheckIn from "./pages/CheckIn";
import { Loader2 } from "lucide-react";

// Configure QueryClient — offline-friendly: don't retry when offline
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      // Don't keep queries in loading state when offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Component to initialize notification sound listener
const NotificationSoundProvider = ({ children }: { children: React.ReactNode }) => {
  useNotificationSound();
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setRedirectTo("/welcome");
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client.runtime");
        const [{ data: client }, { data: captain }] = await Promise.all([
          supabase.from("client_accounts").select("subscriber_id").eq("user_id", user.id).maybeSingle(),
          supabase.from("captain_accounts").select("captain_name").eq("user_id", user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        if (client) setRedirectTo("/portal/home");
        else if (captain) setRedirectTo("/captain");
        else setRedirectTo(null);
      } catch {
        if (!cancelled) setRedirectTo(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (redirectTo) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Check if this is the first load in session
  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem('hasLoaded');
    if (hasLoadedBefore) {
      setShowSplash(false);
      setIsFirstLoad(false);
    }
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem('hasLoaded', 'true');
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <NotificationSoundProvider>
              {/* Splash Screen - only on first load */}
              {showSplash && isFirstLoad && (
                <SplashScreen onComplete={handleSplashComplete} />
              )}
              
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/lookup" element={<CustomerLookup />} />
                <Route path="/install" element={<Install />} />
                <Route path="/portal/login" element={<ClientLogin />} />
                <Route path="/portal/reset" element={<ClientResetPassword />} />
                <Route path="/portal" element={<PortalLayout />}>
                  <Route index element={<Navigate to="/portal/home" replace />} />
                  <Route path="home" element={<PortalHome />} />
                  <Route path="subscription" element={<PortalSubscription />} />
                  <Route path="chat" element={<PortalChat />} />
                  <Route path="requests" element={<PortalRequests />} />
                  <Route path="profile" element={<PortalProfile />} />
                  <Route path="notifications" element={<PortalNotifications />} />
                </Route>
                <Route path="/captain/login" element={<CaptainLogin />} />
                <Route path="/captain" element={<CaptainDashboard />} />
                <Route path="/checkin" element={<CheckIn />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </NotificationSoundProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
