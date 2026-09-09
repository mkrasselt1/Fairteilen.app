# Fairteilen.app – Produktions-Image
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

RUN chown -R nextjs:nodejs /app/.next
USER nextjs
EXPOSE 3000

# Beim Start auf die Datenbank warten, das Schema anwenden, dann den Server starten.
CMD ["sh", "-c", "for i in $(seq 1 30); do npx prisma db push --skip-generate && break; echo 'Warte auf die Datenbank …'; sleep 2; done; npm start"]
