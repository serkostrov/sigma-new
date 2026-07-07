import { cn } from "@/lib/utils";
import { formatUnreadCount } from "@/lib/chat-unread";

export function ChatUnreadBadge({
  count,
  className,
  size = "sm",
}: {
  count: number;
  className?: string;
  size?: "sm" | "xs";
}) {
  if (count <= 0) return null;

  const label = formatUnreadCount(count);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold leading-none tabular-nums",
        size === "xs" ? "min-w-[1rem] h-4 px-1 text-[10px]" : "min-w-[1.25rem] h-5 px-1.5 text-[11px]",
        className,
      )}
      aria-label={`${count} непрочитанных`}
    >
      {label}
    </span>
  );
}
