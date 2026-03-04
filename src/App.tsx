import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { SplashScreen } from "@/components/SplashScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CustomerLookup from "./pages/CustomerLookup";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
    </ThemeProvider>
  );
};

export default App;
