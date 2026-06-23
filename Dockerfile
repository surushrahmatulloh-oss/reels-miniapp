FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

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
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter backend

COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/frontend/dist apps/frontend/dist

ENV NODE_ENV=production
ENV USE_MEMORY_DB=true

EXPOSE 10000
CMD ["node", "apps/backend/dist/index.js"]
