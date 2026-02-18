import { BrowserRouter, Routes, Route } from "react-router-dom";
import Providers from "@/providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomePage } from "@/pages/HomePage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { MarketDetailPage } from "@/pages/MarketDetailPage";
import { WalletPage } from "@/pages/WalletPage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/market/:conditionId" element={<MarketDetailPage />} />
          <Route path="/wallet/:address" element={<WalletPage />} />
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
