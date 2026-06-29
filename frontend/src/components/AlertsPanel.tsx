import { AnimatePresence, motion } from "framer-motion";
import LiquidGlass from "./LiquidGlass";
import { RISK_COLORS, riskLevel, type ScoredTransaction } from "../types/transaction";

interface Props {
  transactions: ScoredTransaction[];
}

export default function AlertsPanel({ transactions }: Props) {
  const flagged = transactions.filter((t) => t.flagged).slice(0, 9);

  return (
    <div className="col-span-12">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-body text-sm text-white/60">// Flagged Alerts</h2>
        <span className="rounded-full bg-risk-high/15 px-2.5 py-0.5 font-mono text-xs text-risk-high">
          {flagged.length}
        </span>
      </div>

      {flagged.length === 0 ? (
        <LiquidGlass className="grid h-32 place-items-center rounded-2xl">
          <span className="font-body text-sm text-white/30">
            No flagged transactions yet — the stream is clean.
          </span>
        </LiquidGlass>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {flagged.map((txn) => (
              <AlertCard key={txn.transaction_id} txn={txn} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function AlertCard({ txn }: { txn: ScoredTransaction }) {
  const color = RISK_COLORS[riskLevel(txn.risk_score)];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <LiquidGlass className="rounded-2xl border-l-2 border-risk-high/40 p-4">
        <div className="flex items-start justify-between">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl font-mono text-lg font-semibold"
            style={{ background: `${color}1f`, color }}
          >
            {txn.risk_score}
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-white/90">
              ${txn.amount.toFixed(2)}
            </div>
            <div className="font-mono text-[11px] text-white/40">
              {txn.transaction_id}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {txn.risk_flags.map((f, i) => (
            <span
              key={`${f.feature}-${i}`}
              className="rounded-full bg-white/[0.04] px-2.5 py-1 font-body text-[11px] text-white/70"
            >
              {f.label}
            </span>
          ))}
        </div>
      </LiquidGlass>
    </motion.div>
  );
}
