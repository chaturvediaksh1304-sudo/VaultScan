import type { CSSProperties, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
  strong?: boolean;
  style?: CSSProperties;
  as?: "div" | "span" | "section";
}

/** Thin wrapper applying the liquid-glass treatment with an optional strong
 *  (heavier blur) variant. Border radius / padding come from `className`. */
export default function LiquidGlass({
  children,
  className = "",
  strong = false,
  style,
  as = "div",
}: Props) {
  const Tag = as as "div";
  return (
    <Tag
      className={`liquid-glass ${strong ? "liquid-glass-strong" : ""} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
