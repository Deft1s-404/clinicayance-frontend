FROM node:20-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
# garante que o diretório exista mesmo se o projeto não tiver arquivos estáticos ancora
RUN mkdir -p public
RUN npm run build

FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/postcss.config.js ./postcss.config.js
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]
