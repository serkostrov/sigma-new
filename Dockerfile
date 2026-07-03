# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# lockfile generated with npm 11; node:22-alpine ships npm 10
RUN npm install -g npm@11 && npm ci

FROM deps AS builder
WORKDIR /app
COPY . .

# Vite inlines VITE_* at build time; SUPABASE_* used as fallback build args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-$SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY:-$SUPABASE_PUBLISHABLE_KEY}
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8090

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8090)).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
