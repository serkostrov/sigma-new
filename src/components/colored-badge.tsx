import { cn } from "@/lib/utils";

export function hexWithAlpha(hex: string, alpha: number) {
  const h = (hex || "#64748b").replace("#", "");
  if (h.length !== 6) return `rgba(100,116,139,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function colorChipStyle(color: string) {
  return {
    backgroundColor: hexWithAlpha(color, 0.14),
    color,
    borderColor: "transparent",
  } as React.CSSProperties;
}

export function ColoredBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      style={colorChipStyle(color)}
      className={cn(
        "inline-flex items-center px-2.5 h-7 rounded-full border-0 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {name}
    </span>
  );
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block w-2.5 h-2.5 rounded-full", className)}
      style={{ background: color }}
    />
  );
}