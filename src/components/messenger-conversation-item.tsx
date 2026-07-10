import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatUnreadBadge } from "@/components/chat-unread-badge";
import { formatConversationPreview } from "@/lib/chat-unread";
import { cn } from "@/lib/utils";

export function MessengerConversationItem({
  title,
  subtitle,
  preview,
  photoUrl,
  initials,
  unreadCount,
  active,
  href,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  preview: string | null;
  photoUrl?: string | null;
  initials: string;
  unreadCount: number;
  active: boolean;
  href?: string | null;
  onClick: () => void;
}) {
  const hasUnread = unreadCount > 0;
  const previewText = formatConversationPreview(preview);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left rounded-lg transition-colors",
        active ? "bg-primary/10" : hasUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/60",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {photoUrl ? <AvatarImage src={photoUrl} alt={title} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {hasUnread ? (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "text-sm truncate hover:underline text-primary",
                hasUnread ? "font-semibold" : "font-medium",
              )}
            >
              {title}
            </a>
          ) : (
            <span
              className={cn(
                "text-sm truncate",
                hasUnread ? "font-semibold text-foreground" : "font-medium",
              )}
            >
              {title}
            </span>
          )}
          <ChatUnreadBadge count={unreadCount} size="xs" />
        </div>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        ) : null}
        <p
          className={cn(
            "text-xs truncate mt-0.5",
            hasUnread ? "text-foreground/80" : "text-muted-foreground",
          )}
        >
          {previewText}
        </p>
      </div>
    </button>
  );
}
