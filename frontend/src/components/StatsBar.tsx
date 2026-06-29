import { Activity, AlertTriangle, Gauge, Layers } from "lucide-react";
import LiquidGlass from "./LiquidGlass";
import type { Stats } from "../types/transaction";

interface Props {
  stats: Stats;
}

function latencyColor(ms: number): string {
  if (ms <= 0) return "text-white";
  if (ms < 20) return "text-risk-low";
  if (ms < 50) return "text-risk-medium";
  return "text-risk-high";
}

function fraudColor(pct: number): string {
  if (pct >= 1) return "text-risk-high";
  if (pct >= 0.5) return "text-risk-medium";
  return "text-white";
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="col-span-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      <StatCard
        icon={<Layers size={16} />}
        label="Total Processed"
        value={stats.total_processed.toLocaleString()}
        valueClass="text-risk-low"
      />
      <StatCard
        icon={<AlertTriangle size={16} />}
        label="Fraud Rate"
        value={`${stats.fraud_rate_pct.toFixed(2)}%`}
        valueClass={fraudColor(stats.fraud_rate_pct)}
      />
      <StatCard
        icon={<Gauge size={16} />}
        label="Avg Latency"
        value={`${stats.avg_latency_ms.toFixed(1)}ms`}
        valueClass={latencyColor(stats.avg_latency_ms)}
      />
      <StatCard
        icon={<Activity size={16} />}
        label="Flagged · last 60s"
        value={stats.flagged_last_minute.toString()}
        valueClass={stats.flagged_last_minute > 0 ? "text-risk-high" : "text-white"}
        pulse={stats.flagged_last_minute > 0}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueClass,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass: string;
  pulse?: boolean;
}) {
  return (
    <LiquidGlass className="rounded-2xl p-5">
      <div className="mb-2 flex items-center gap-2 text-white/45">
        <span className={pulse ? "animate-pulse-dot" : ""}>{icon}</span>
        <span className="font-body text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className={`tnum font-mono text-3xl font-medium ${valueClass}`}>
        {value}
      </div>
    </LiquidGlass>
  );
}
