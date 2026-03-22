import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import SpeakingPage from "@/pages/Speaking";
import WritingPage from "@/pages/Writing";
import ReadingPage from "@/pages/Reading";
import ListeningPage from "@/pages/Listening";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.exam_type) return <Navigate to="/onboarding" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function OnboardingRoute() {
  const { user, loading, profile } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.exam_type) return <Navigate to="/" replace />;
  return <Onboarding />;
}

// Placeholder pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-6 flex items-center justify-center min-h-[50vh]">
    <div className="text-center">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/practice/speaking" element={<ProtectedRoute><ErrorBoundary><SpeakingPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/practice/writing" element={<ProtectedRoute><ErrorBoundary><WritingPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/practice/reading" element={<ProtectedRoute><ErrorBoundary><ReadingPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/practice/listening" element={<ProtectedRoute><ErrorBoundary><ListeningPage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/mock-test" element={<ProtectedRoute><ErrorBoundary><PlaceholderPage title="Mock Test" /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ErrorBoundary><PlaceholderPage title="Progress" /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><ErrorBoundary><PlaceholderPage title="Pricing" /></ErrorBoundary></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
