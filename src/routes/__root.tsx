import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppLayout } from "@/components/app-layout";
import { DataStoreProvider } from "@/lib/data-store";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { PermissionProvider } from "@/lib/permission-context";
import { usePermissions } from "@/lib/permissions";
import { useEffect } from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { getRuntimeSupabaseConfigForShell } from "@/lib/supabase-env";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "СК СИГМА — Внутренняя система" },
      { name: "description", content: "Внутренняя рабочая система СК СИГМА: объекты, задачи, фотоотчеты, сметы, инструмент." },
      { name: "author", content: "СК СИГМА" },
      { property: "og:title", content: "СК СИГМА — Внутренняя система" },
      { property: "og:description", content: "Внутренняя рабочая система СК СИГМА: объекты, задачи, фотоотчеты, сметы, инструмент." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "СК СИГМА — Внутренняя система" },
      { name: "twitter:description", content: "Внутренняя рабочая система СК СИГМА: объекты, задачи, фотоотчеты, сметы, инструмент." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/303e6729-da28-4b4a-8244-3b9c3723d41a/id-preview-86c7febc--33a907d5-4008-4a23-b552-e6cc9589e35f.lovable.app-1779212758791.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/303e6729-da28-4b4a-8244-3b9c3723d41a/id-preview-86c7febc--33a907d5-4008-4a23-b552-e6cc9589e35f.lovable.app-1779212758791.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const supabaseConfig = getRuntimeSupabaseConfigForShell();
  const configScript = supabaseConfig
    ? `window.__SUPABASE_CONFIG__=${JSON.stringify(supabaseConfig)}`
    : null;

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {configScript ? (
          <script dangerouslySetInnerHTML={{ __html: configScript }} />
        ) : null}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionProvider>
          <DataStoreProvider>
            <AuthGate />
          </DataStoreProvider>
        </PermissionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
  const { canAccessRoute, loading: rolesLoading } = usePermissions();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session && path !== "/auth") navigate({ to: "/auth", replace: true });
    if (session && path === "/auth") navigate({ to: "/", replace: true });
  }, [loading, session, path, navigate]);

  useEffect(() => {
    if (loading || rolesLoading || !session || path === "/auth") return;
    if (!canAccessRoute(path)) navigate({ to: "/", replace: true });
  }, [loading, rolesLoading, session, path, canAccessRoute, navigate]);

  if (loading || (session && rolesLoading)) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (!session || path === "/auth") {
    return <Outlet />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
