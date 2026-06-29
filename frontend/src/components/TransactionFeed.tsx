import { motion } from "framer-motion";
import LiquidGlass from "./LiquidGlass";
import { RISK_COLORS, riskLevel, type ScoredTransaction } from "../types/transaction";

interface Props {
  transactions: ScoredTransaction[];
  isConnected: boolean;
}

export default function TransactionFeed({ transactions, isConnected }: Props) {
  const rows = transactions.slice(0, 50);
  return (
    <LiquidGlass className="col-span-12 flex h-[560px] flex-col rounded-2xl p-5 lg:col-span-7">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-body text-sm text-white/60">// Live Feed</h2>
        <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-white/60">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isConnected ? "animate-pulse-dot bg-emerald-400" : "bg-white/30"
            }`}
          />
          {isConnected ? "10 txn/s" : "offline"}
        </span>
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[1fr_auto_120px_auto] items-center gap-3 px-2 pb-2 font-body text-[11px] uppercase tracking-wider text-white/30">
        <span>Transaction</span>
        <span className="text-right">Amount</span>
        <span>Risk</span>
        <span className="text-right">Status</span>
      </div>

      <div className="-mr-2 flex-1 overflow-y-auto pr-2">
        {rows.map((txn) => (
          <FeedRow key={txn.transaction_id} txn={txn} />
        ))}
        {rows.length === 0 && (
          <div className="grid h-full place-items-center font-body text-sm text-white/30">
            Waiting for transactions…
          </div>
        )}
      </div>
    </LiquidGlass>
  );
}

function FeedRow({ txn }: { txn: ScoredTransaction }) {
  const level = riskLevel(txn.risk_score);
  const color = RISK_COLORS[level];
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`grid grid-cols-[1fr_auto_120px_auto] items-center gap-3 rounded-lg px-2 py-2.5 ${
        txn.flagged ? "border-l-2 border-risk-high bg-risk-high/5" : ""
      }`}
    >
      <span className="truncate font-mono text-xs text-white/55">
        {txn.transaction_id}
      </span>
      <span className="text-right font-mono text-sm text-white/90">
        ${txn.amount.toFixed(2)}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${txn.risk_score}%`, background: color }}
          />
        </div>
        <span className="tnum font-mono text-xs" style={{ color }}>
          {txn.risk_score}
        </span>
      </div>
      <div className="text-right">
        {txn.flagged ? (
          <span className="rounded-full bg-risk-high/15 px-2.5 py-1 font-body text-[11px] font-medium text-risk-high">
            Flagged
          </span>
        ) : (
          <span className="rounded-full bg-white/5 px-2.5 py-1 font-body text-[11px] text-white/40">
            Clean
          </span>
        )}
      </div>
    </motion.div>
  );
}
