// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Node.js server output for Docker / Dokploy (`.output/server/index.mjs`)
  nitro: {
    preset: "node-server",
    // Пробрасываем секреты в runtime (не в клиентский бандл)
    env: [
      "AVITO_CLIENT_ID",
      "AVITO_CLIENT_SECRET",
      "AVITO_USER_ID",
      "VK_ACCESS_TOKEN",
      "VK_APP_ID",
      "VK_APP_SECRET",
      "VK_REDIRECT_URI",
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  },
});
