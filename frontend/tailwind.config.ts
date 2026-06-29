import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        surface: "#080808",
        "glass-border": "rgba(255,255,255,0.12)",
        risk: {
          low: "#22C55E",
          medium: "#F59E0B",
          high: "#EF4444",
        },
      },
      fontFamily: {
        heading: ["'Instrument Serif'", "serif"],
        body: ["'Barlow'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.8)" },
        },
        "aurora-drift": {
          "0%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(8%,-6%) scale(1.15)" },
          "66%": { transform: "translate(-6%,8%) scale(0.95)" },
          "100%": { transform: "translate(0,0) scale(1)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "aurora-drift": "aurora-drift 24s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
