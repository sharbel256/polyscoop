import { BrowserRouter, Routes, Route } from "react-router-dom";
import Providers from "@/providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DashboardPage } from "@/pages/DashboardPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { WalletPage } from "@/pages/WalletPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { LiveFeedPage } from "@/pages/LiveFeedPage";
import { CopyTradePage } from "@/pages/CopyTradePage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { TransparencyPage } from "@/pages/TransparencyPage";

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/wallet/:address" element={<WalletPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/feed" element={<LiveFeedPage />} />
          <Route path="/copytrade" element={<CopyTradePage />} />
          <Route path="/transparency" element={<TransparencyPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  if (!import.meta.env.DEV) {
    return <ComingSoonPage />;
  }

  return (
    <Providers>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </Providers>
  );
}
