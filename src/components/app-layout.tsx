import { ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  Camera,
  Wrench,
  FolderArchive,
  Wallet,
  FileText,
  Menu,
  X,
  Users,
  UserSquare2,
  HardHat,
  Settings,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useChatUnreadCounts } from "@/lib/chat-unread-api";
import { usePermissions } from "@/lib/permissions";
import { ChatUnreadBadge } from "@/components/chat-unread-badge";
import { cn } from "@/lib/utils";
import logoWhite from "@/assets/logo-white.svg";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/": LayoutDashboard,
  "/objects": Building2,
  "/tasks": ListChecks,
  "/customers": UserSquare2,
  "/brigades": HardHat,
  "/photos": Camera,
  "/tools": Wrench,
  "/documents": FolderArchive,
  "/expenses": Wallet,
  "/estimates": FileText,
  "/chat": MessageCircle,
  "/users": Users,
  "/settings": Settings,
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, primaryRoleLabel, signOut } = useAuth();
  const { nav, has } = usePermissions();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const showChatUnread = has("chat.view");
  const { data: unread } = useChatUnreadCounts(showChatUnread);

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-[#2E3D4C] text-primary-foreground flex flex-col transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
          <img src={logoWhite} alt="СК СИГМА" className="w-8 h-8" />
          <div className="font-semibold tracking-tight text-lg">СК СИГМА</div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = ICONS[item.to] ?? LayoutDashboard;
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to as string}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.to === "/chat" ? <ChatUnreadBadge count={unread?.total ?? 0} size="xs" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="px-2 py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 grid place-items-center text-xs font-semibold">
                {(user?.email ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-sm font-medium truncate">{user?.email}</div>
                <div className="text-xs text-white/60 truncate">{primaryRoleLabel}</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <header className="h-14 bg-card border-b border-border flex items-center gap-3 px-4 md:hidden sticky top-0 z-20">
          <button
            className="p-2 -ml-2 rounded-md hover:bg-muted"
            onClick={() => setOpen((o) => !o)}
            aria-label="Меню"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary grid place-items-center">
              <img src={logoWhite} alt="СК СИГМА" className="w-4 h-4" />
            </div>
            <span className="font-semibold">СК СИГМА</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 w-full">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
