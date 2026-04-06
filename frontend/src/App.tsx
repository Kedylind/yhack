import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import MapPage from "./pages/MapPage";
import Saved from "./pages/Saved";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import WhyItMatters from "./pages/WhyItMatters";
import Team from "./pages/Team";
import OurData from "./pages/OurData";
import ProductVision from "./pages/ProductVision";
import RequireFullProfile from "@/components/RequireFullProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/why-it-matters" element={<WhyItMatters />} />
            <Route path="/team" element={<Team />} />
            <Route path="/our-data" element={<OurData />} />
            <Route path="/our-approach" element={<ProductVision />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/map"
              element={
                <RequireFullProfile>
                  <MapPage />
                </RequireFullProfile>
              }
            />
            <Route
              path="/saved"
              element={
                <RequireFullProfile>
                  <Saved />
                </RequireFullProfile>
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
