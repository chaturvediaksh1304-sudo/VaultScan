import { forwardRef } from "react";
import AuroraBackground from "./AuroraBackground";
import StatsBar from "./StatsBar";
import TransactionFeed from "./TransactionFeed";
import RiskGauge from "./RiskGauge";
import AlertsPanel from "./AlertsPanel";
import type { ScoredTransaction, Stats } from "../types/transaction";

interface Props {
  transactions: ScoredTransaction[];
  stats: Stats;
  isConnected: boolean;
  latest: ScoredTransaction | null;
}

const Dashboard = forwardRef<HTMLElement, Props>(function Dashboard(
  { transactions, stats, isConnected, latest },
  ref
) {
  return (
    <section ref={ref} className="relative min-h-screen w-full overflow-hidden bg-void">
      <AuroraBackground variant="dashboard" />
      <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-12 gap-6 px-6 pb-12 pt-24 md:px-12">
        <div className="col-span-12 flex items-center justify-between">
          <h1 className="font-heading text-3xl italic text-white md:text-4xl">
            Live Risk Dashboard
          </h1>
          <span className="flex items-center gap-2 font-body text-sm text-white/50">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "animate-pulse-dot bg-emerald-400" : "bg-risk-high"
              }`}
            />
            {isConnected ? "Connected" : "Reconnecting…"}
          </span>
        </div>

        <StatsBar stats={stats} />
        <TransactionFeed transactions={transactions} isConnected={isConnected} />
        <RiskGauge latest={latest} />
        <AlertsPanel transactions={transactions} />
      </div>
    </section>
  );
});

export default Dashboard;
