FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile

COPY . .
# Cache bust — forces full rebuild (same as Clear build cache on Render)
ARG CACHEBUST=20260630-v530
RUN echo "build ${CACHEBUST}"
ENV VITE_API_URL=
ENV VITE_WS_URL=
RUN pnpm --filter backend build && pnpm --filter frontend build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate

COPY --from=build /app /app

ENV NODE_ENV=production
ENV USE_MEMORY_DB=false
ENV ALLOW_DEV_AUTH=true
ENV HOST=0.0.0.0
ENV NODE_OPTIONS=--max-old-space-size=460

EXPOSE 10000
CMD ["node", "apps/backend/dist/index.js"]
