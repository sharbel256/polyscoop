import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Providers from "@/providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/ui/PageTransition";
import { DashboardPage } from "@/pages/DashboardPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { WalletPage } from "@/pages/WalletPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { CopyTradePage } from "@/pages/CopyTradePage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { TransparencyPage } from "@/pages/TransparencyPage";
import { GetitLayout } from "@/pages/getit/GetitLayout";
import { GetitDashboard } from "@/pages/getit/GetitDashboard";
import { JobsPage } from "@/pages/getit/JobsPage";
import { AdminPage } from "@/pages/getit/AdminPage";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <DashboardPage />
            </PageTransition>
          }
        />
        <Route
          path="/portfolio"
          element={
            <PageTransition>
              <PortfolioPage />
            </PageTransition>
          }
        />
        <Route
          path="/wallet/:address"
          element={
            <PageTransition>
              <WalletPage />
            </PageTransition>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <PageTransition>
              <LeaderboardPage />
            </PageTransition>
          }
        />
        <Route
          path="/copytrade"
          element={
            <PageTransition>
              <CopyTradePage />
            </PageTransition>
          }
        />
        <Route
          path="/transparency"
          element={
            <PageTransition>
              <TransparencyPage />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function AppLayout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 -z-10 bg-surface">
        <div className="absolute left-0 top-0 h-[50vh] w-[50vw] rounded-full bg-brand-950/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[40vw] rounded-full bg-purple-950/15 blur-[100px]" />
      </div>

      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8 lg:px-8">
        <AnimatedRoutes />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/getit" element={<GetitLayout />}>
            <Route index element={<GetitDashboard />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route
            path="*"
            element={!import.meta.env.DEV ? <ComingSoonPage /> : <AppLayout />}
          />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
