interface Props {
  variant?: "hero" | "dashboard";
}

/** Self-contained cinematic background — drifting aurora blobs over true black
 *  with a faint data grid and vignette. Used in place of a background video so
 *  the demo looks alive with zero external assets. (Drop a video in via
 *  FadingVideo if you have one.) */
export default function AuroraBackground({ variant = "hero" }: Props) {
  const blobs =
    variant === "hero"
      ? [
          { c: "rgba(59,130,246,0.22)", s: "46rem", t: "-12%", l: "8%", d: "0s" },
          { c: "rgba(168,85,247,0.16)", s: "40rem", t: "20%", l: "62%", d: "-8s" },
          { c: "rgba(34,197,94,0.10)", s: "34rem", t: "58%", l: "26%", d: "-16s" },
        ]
      : [
          { c: "rgba(59,130,246,0.16)", s: "40rem", t: "-10%", l: "60%", d: "0s" },
          { c: "rgba(239,68,68,0.10)", s: "34rem", t: "50%", l: "4%", d: "-12s" },
        ];

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-void">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-aurora-drift"
          style={{
            width: b.s,
            height: b.s,
            top: b.t,
            left: b.l,
            background: `radial-gradient(circle at center, ${b.c}, transparent 65%)`,
            filter: "blur(40px)",
            animationDelay: b.d,
          }}
        />
      ))}
      {/* Faint data grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
