import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import JobsDashboard from "./pages/JobsDashboard";
import JobDetails from "./pages/JobDetails";
import MechanicsDirectory from "./pages/MechanicsDirectory";
import Settings from "./pages/Settings";
import ChatBot from "./pages/ChatBot";
import KnowledgeBase from "./pages/KnowledgeBase";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <div className="flex flex-col min-h-screen w-full max-w-lg mx-auto relative">
      <TopBar />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route path="/" element={<AppLayout><JobsDashboard /></AppLayout>} />
            <Route path="/jobs" element={<AppLayout><JobsDashboard /></AppLayout>} />
            <Route path="/jobs/:id" element={<AppLayout><JobDetails /></AppLayout>} />
            <Route path="/mechanics" element={<AppLayout><MechanicsDirectory /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/chat" element={<AppLayout><ChatBot /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
