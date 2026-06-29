import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import LiquidGlass from "./LiquidGlass";

const NAV_ITEMS = ["Overview", "Live Feed", "Risk Engine", "API Docs", "About"];

interface Props {
  onOpenDashboard: () => void;
}

export default function Navbar({ onOpenDashboard }: Props) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed left-1/2 top-4 z-50 flex w-[min(1100px,94vw)] -translate-x-1/2 items-center justify-between"
    >
      <LiquidGlass className="grid h-12 w-12 place-items-center rounded-full">
        <span className="font-heading text-2xl italic leading-none text-white">v</span>
      </LiquidGlass>

      <LiquidGlass className="hidden items-center gap-1 rounded-full px-2 py-1.5 md:flex">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            onClick={item === "Live Feed" ? onOpenDashboard : undefined}
            className="rounded-full px-4 py-1.5 font-body text-sm text-white/65 transition-colors hover:text-white"
          >
            {item}
          </button>
        ))}
      </LiquidGlass>

      <LiquidGlass
        strong
        as="div"
        className="rounded-full"
      >
        <button
          onClick={onOpenDashboard}
          className="flex items-center gap-1.5 px-5 py-2.5 font-body text-sm font-medium text-white"
        >
          View Live Demo
          <ArrowUpRight size={16} />
        </button>
      </LiquidGlass>
    </motion.nav>
  );
}
