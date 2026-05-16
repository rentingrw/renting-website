FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY . .
RUN pnpm install --frozen-lockfile
# Generate Prisma client before compiling so dist has the correct types
RUN pnpm --filter @rentingi/db generate
RUN pnpm --filter @rentingi/api build

FROM node:20-alpine AS runner

WORKDIR /app
# Copy the compiled API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# Copy the full node_modules tree (includes .pnpm store) so pnpm symlinks resolve
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
