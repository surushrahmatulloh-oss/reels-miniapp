FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile

COPY . .
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
ENV HOST=0.0.0.0

EXPOSE 10000
CMD ["node", "apps/backend/dist/index.js"]
