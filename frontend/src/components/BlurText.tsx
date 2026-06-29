import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  text: string;
  className?: string;
  delay?: number; // seconds before the first word animates
  stagger?: number; // seconds between words
}

/** Word-by-word blur-in animation, triggered when the element scrolls into
 *  view. Mirrors the spec: blur(10px)/opacity 0/y 50 → blur(0)/opacity 1/y 0. */
export default function BlurText({
  text,
  className = "",
  delay = 0,
  stagger = 0.1,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If already in the viewport on mount (above-the-fold hero text), animate
    // immediately. IntersectionObserver callbacks can be throttled when the tab
    // isn't foregrounded, so don't depend on them for visible-on-load content.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <span
      ref={ref}
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        rowGap: "0.1em",
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          style={{ display: "inline-block", marginRight: "0.28em" }}
          initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
          animate={
            inView
              ? {
                  filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [50, -5, 0],
                }
              : {}
          }
          transition={{
            duration: 0.7,
            times: [0, 0.5, 1],
            ease: "easeOut",
            delay: delay + i * stagger,
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
