import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import LiquidGlass from "./LiquidGlass";
import type { ScoredTransaction } from "../types/transaction";

interface Props {
  latest: ScoredTransaction | null;
}

/** Interpolate green(0) → amber(50) → red(100). */
function interpColor(score: number): string {
  const stops: [number, [number, number, number]][] = [
    [0, [34, 197, 94]],
    [50, [245, 158, 11]],
    [100, [239, 68, 68]],
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (score >= stops[i][0] && score <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = (score - lo[0]) / Math.max(hi[0] - lo[0], 1);
  const c = lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const R = 80;
const CIRC = 2 * Math.PI * R;
const ARC = 0.75; // 270° gauge

export default function RiskGauge({ latest }: Props) {
  const score = latest?.risk_score ?? 0;
  const color = interpColor(score);
  const dash = CIRC * ARC;
  const offset = dash * (1 - score / 100);

  return (
    <LiquidGlass className="col-span-12 flex h-[560px] flex-col rounded-2xl p-5 lg:col-span-5">
      <h2 className="mb-2 font-body text-sm text-white/60">// Risk Engine</h2>

      <div className="relative mx-auto mt-2 grid place-items-center">
        <svg width="220" height="220" viewBox="0 0 200 200" className="-rotate-[135deg]">
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
          />
          <motion.circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            initial={false}
            animate={{ strokeDashoffset: offset, stroke: color }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <motion.span
            key={score}
            initial={{ opacity: 0.4, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-heading text-6xl italic leading-none"
            style={{ color }}
          >
            {score}
          </motion.span>
          <span className="mt-1 font-body text-xs uppercase tracking-widest text-white/40">
            Risk Score
          </span>
        </div>
      </div>

      {/* Latest transaction detail */}
      <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-4">
        <div>
          <div className="font-mono text-sm text-white/85">
            ${latest ? latest.amount.toFixed(2) : "0.00"}
          </div>
          <div className="font-mono text-xs text-white/40">
            {latest?.transaction_id ?? "—"}
          </div>
        </div>
        {latest?.flagged ? (
          <span className="rounded-full bg-risk-high/15 px-3 py-1 font-body text-xs font-medium text-risk-high">
            Suspicious
          </span>
        ) : (
          <span className="rounded-full bg-risk-low/15 px-3 py-1 font-body text-xs font-medium text-risk-low">
            Cleared
          </span>
        )}
      </div>

      {/* Risk flags */}
      <div className="mt-4 flex flex-1 flex-col gap-2">
        {latest && latest.risk_flags.length > 0 ? (
          latest.risk_flags.map((f, i) => (
            <div
              key={`${f.feature}-${i}`}
              className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <span className="font-body text-sm text-white/80">{f.label}</span>
              <span className="ml-auto font-mono text-[11px] text-white/35">
                {f.feature}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-white/45">
            <ShieldCheck size={16} className="text-risk-low" />
            <span className="font-body text-sm">No anomalies detected</span>
          </div>
        )}
      </div>
    </LiquidGlass>
  );
}
