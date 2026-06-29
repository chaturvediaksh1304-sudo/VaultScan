import { motion } from "framer-motion";
import { Radio, ScanLine, Siren } from "lucide-react";
import LiquidGlass from "./LiquidGlass";

const CARDS = [
  {
    icon: Radio,
    title: "Ingest",
    body: "Transactions stream through the pipeline at configurable throughput — 10 to 10,000 per second.",
    tags: ["Kafka-ready", "Low Latency", "Durable", "Scalable"],
  },
  {
    icon: ScanLine,
    title: "Score",
    body: "Isolation Forest detects anomalies without labeled training data, the way real production systems work.",
    tags: ["Unsupervised", "SHAP", "Real-time", "Explainable"],
  },
  {
    icon: Siren,
    title: "Alert",
    body: "Flagged transactions surface instantly on the dashboard with visual risk flags — no SQL queries needed.",
    tags: ["WebSocket", "Live", "Visual", "Actionable"],
  },
];

export default function HowItWorks() {
  return (
    <section className="relative w-full bg-void px-6 py-28 md:px-12">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="mb-3 text-center font-heading text-4xl italic text-white md:text-5xl">
          How it works
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center font-body text-white/55">
          Three stages, one continuous pipeline — from raw transaction to scored
          alert in milliseconds.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.12 }}
            >
              <LiquidGlass className="h-full rounded-3xl p-7">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
                  <card.icon size={22} className="text-white/80" />
                </div>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="font-mono text-xs text-white/35">
                    0{i + 1}
                  </span>
                  <h3 className="font-heading text-2xl italic text-white">
                    {card.title}
                  </h3>
                </div>
                <p className="mb-5 font-body text-sm leading-relaxed text-white/60">
                  {card.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white/[0.04] px-2.5 py-1 font-body text-[11px] text-white/55"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </LiquidGlass>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
