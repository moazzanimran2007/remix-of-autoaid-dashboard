import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import JobsDashboard from "./pages/JobsDashboard";
import JobDetails from "./pages/JobDetails";
import MechanicsDirectory from "./pages/MechanicsDirectory";
import Settings from "./pages/Settings";
import ChatBot from "./pages/ChatBot";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen w-full max-w-lg mx-auto relative">
          <TopBar />
          <main className="flex-1 pb-20">
            <Routes>
              <Route path="/" element={<JobsDashboard />} />
              <Route path="/jobs" element={<JobsDashboard />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/mechanics" element={<MechanicsDirectory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/chat" element={<ChatBot />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
