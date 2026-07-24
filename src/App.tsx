import AuthGate from "@/components/desktop/AuthGate";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/layouts/desktop/AppLayout";
import AssetsPage from "@/pages/desktop/AssetsPage";
import ChatPage from "@/pages/desktop/ChatPage";
import DashboardPage from "@/pages/desktop/DashboardPage";
import ImportPage from "@/pages/desktop/ImportPage";
import LandingPage from "@/pages/desktop/LandingPage";
import SharedReportPage from "@/pages/desktop/SharedReportPage";
import StressTestPage from "@/pages/desktop/StressTestPage";
import XRayPage from "@/pages/desktop/XRayPage";
import NotFound from "@/pages/NotFound";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { createBrowserRouter, createRoutesFromElements, Outlet, Route, RouterProvider, ScrollRestoration } from "react-router-dom";

const queryClient = new QueryClient();

function RootLayout() {
  return <><Outlet /><ScrollRestoration /></>;
}

const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<RootLayout />}>
    <Route path="/" element={<LandingPage />} />
    <Route path="/share/:slug" element={<SharedReportPage />} />
    <Route element={<AuthGate><AppLayout /></AuthGate>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/assets" element={<AssetsPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/xray" element={<XRayPage />} />
      <Route path="/stress-test" element={<StressTestPage />} />
      <Route path="/chat" element={<ChatPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Route>
));

const App = () => <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
  <QueryClientProvider client={queryClient}><TooltipProvider><Sonner /><RouterProvider router={router} /></TooltipProvider></QueryClientProvider>
</ThemeProvider>;

export default App;
