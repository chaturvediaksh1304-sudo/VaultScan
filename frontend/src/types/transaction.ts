export interface RiskFlag {
  feature: string;
  direction: string;
  label: string;
}

export interface ScoredTransaction {
  transaction_id: string;
  amount: number;
  risk_score: number;
  flagged: boolean;
  risk_flags: RiskFlag[];
  latency_ms: number;
  timestamp: string;
  is_replay: boolean;
  original_label: number | null;
}

export interface Stats {
  total_processed: number;
  fraud_rate_pct: number;
  avg_latency_ms: number;
  flagged_last_minute: number;
}

export type RiskLevel = "low" | "medium" | "high";

export function riskLevel(score: number): RiskLevel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#22C55E",
  medium: "#F59E0B",
  high: "#EF4444",
};
