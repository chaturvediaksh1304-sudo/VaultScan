import { motion } from "framer-motion";
import { ArrowUpRight, Clock, ExternalLink, Shield } from "lucide-react";
import AuroraBackground from "./AuroraBackground";
import BlurText from "./BlurText";
import LiquidGlass from "./LiquidGlass";
import Navbar from "./Navbar";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.7, ease: "easeOut", delay },
});

const SPECS = ["Isolation Forest", "SHAP", "Kafka", "FastAPI", "GCP"];

interface Props {
  onOpenDashboard: () => void;
}

export default function Hero({ onOpenDashboard }: Props) {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-void">
      <AuroraBackground variant="hero" />
      <Navbar onOpenDashboard={onOpenDashboard} />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-36 text-center md:pt-44">
        {/* Live badge */}
        <motion.div {...fade(0.4)}>
          <LiquidGlass className="flex items-center gap-2.5 rounded-full px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-body text-sm text-white/80">
              Real-time fraud scoring at 10 transactions/second
            </span>
          </LiquidGlass>
        </motion.div>

        {/* Headline */}
        <div className="mt-8">
          <BlurText
            text="Every Transaction. Scored. Instantly."
            delay={0.5}
            className="font-heading text-6xl italic leading-[0.85] tracking-[-3px] text-white md:text-[5.5rem]"
          />
        </div>

        {/* Subheading */}
        <motion.p
          {...fade(0.8)}
          className="mt-7 max-w-2xl font-body text-lg text-white/65"
        >
          VaultScan detects anomalous transactions in milliseconds using
          unsupervised ML — before fraud clears the wire.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fade(1.1)} className="mt-9 flex items-center gap-5">
          <LiquidGlass strong className="rounded-full">
            <button
              onClick={onOpenDashboard}
              className="flex items-center gap-2 px-6 py-3 font-body font-medium text-white"
            >
              Open Dashboard
              <ArrowUpRight size={18} />
            </button>
          </LiquidGlass>
          <a
            href="https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-body text-sm text-white/70 transition-colors hover:text-white"
          >
            Read the Docs
            <ExternalLink size={15} />
          </a>
        </motion.div>

        {/* Stat cards */}
        <motion.div {...fade(1.3)} className="mt-14 flex flex-wrap justify-center gap-5">
          <StatCard
            icon={<Clock size={18} className="text-white/70" />}
            value="< 15ms"
            label="Average scoring latency"
          />
          <StatCard
            icon={<Shield size={18} className="text-white/70" />}
            value="0.997"
            label="ROC-AUC at 0.002 contamination"
          />
        </motion.div>

        {/* Model specs row */}
        <motion.div {...fade(1.45)} className="mt-16 flex flex-col items-center gap-5 pb-24">
          <LiquidGlass className="rounded-full px-4 py-1.5">
            <span className="font-body text-xs uppercase tracking-[0.2em] text-white/45">
              Trained on real-world transaction data
            </span>
          </LiquidGlass>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
            {SPECS.map((s) => (
              <span
                key={s}
                className="font-heading text-2xl italic text-white/55"
              >
                {s}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <LiquidGlass className="w-[220px] rounded-[1.25rem] p-5 text-left">
      <div className="mb-3">{icon}</div>
      <div className="font-mono text-3xl font-medium text-white">{value}</div>
      <div className="mt-1 font-body text-sm text-white/55">{label}</div>
    </LiquidGlass>
  );
}
