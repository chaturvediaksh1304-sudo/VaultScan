import { useRef } from "react";
import Hero from "./components/Hero";
import Dashboard from "./components/Dashboard";
import HowItWorks from "./components/HowItWorks";
import { useTransactionStream } from "./hooks/useTransactionStream";

export default function App() {
  const { transactions, stats, isConnected, latest } = useTransactionStream();
  const dashboardRef = useRef<HTMLElement>(null);

  const scrollToDashboard = () =>
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="min-h-screen bg-void">
      <Hero onOpenDashboard={scrollToDashboard} />
      <Dashboard
        ref={dashboardRef}
        transactions={transactions}
        stats={stats}
        isConnected={isConnected}
        latest={latest}
      />
      <HowItWorks />
      <footer className="border-t border-white/8 bg-void px-6 py-10 text-center md:px-12">
        <p className="font-body text-sm text-white/40">
          VaultScan — Every transaction. Scored. Instantly. · Built with
          Isolation Forest, FastAPI &amp; React
        </p>
      </footer>
    </main>
  );
}
