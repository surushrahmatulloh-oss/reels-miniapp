# Reels Mini App — Telegram Mini App

Instagram-style Reels video platform as a Telegram Mini App. Built per TZ v1.0 spec.

## Stack

| Frontend | Backend |
|----------|---------|
| React 18 + TypeScript + Vite | Node.js + Express |
| @telegram-apps/sdk-react | Socket.io (real-time) |
| Zustand + TanStack Query | MongoDB + Mongoose |
| Tailwind CSS | Redis (cache) + JWT auth |

## Project structure

```
reels-miniapp/
├── apps/
│   ├── frontend/     # React Mini App
│   └── backend/      # REST API + WebSocket
├── docker-compose.yml
├── .env.example
└── package.json
```

## Quick start

### 1. Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- Docker (for MongoDB + Redis)

### 2. Install

```bash
cd "telegram mini app"
pnpm install
cp .env.example .env
```

Edit `.env` and set at minimum:

```
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token   # optional for local dev
```

### 3. Start databases

```bash
docker compose up -d
```

### 4. Seed sample videos

```bash
pnpm seed
```

### 5. Run dev servers

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### 6. Test in Telegram (optional)

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Set `TELEGRAM_BOT_TOKEN` in `.env`
3. Expose frontend with [ngrok](https://ngrok.com/): `ngrok http 5173`
4. In BotFather: `/newapp` → set Mini App URL to your ngrok HTTPS URL

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/telegram` | Telegram initData → JWT |
| POST | `/api/auth/refresh` | Refresh JWT |
| PUT | `/api/users/preferences` | Update categories/formats |
| POST | `/api/users/onboarding` | Complete onboarding |
| GET | `/api/feed` | Personalized video feed |
| POST | `/api/videos/:id/like` | Like video |
| GET | `/api/videos/:id/comments` | Get comments |
| POST | `/api/users/:id/follow` | Follow user |

## WebSocket events

- `join_feed` — subscribe to feed updates
- `like_update` — real-time like counts
- `new_comment` — new comment on video
- `new_video` — new video in feed

## Feed algorithm

- 70% — videos from user's preferred categories
- 20% — trending across all categories
- 10% — new discovery content
- Watched videos are excluded from future feed

## Deploy

- **Frontend**: Vercel (`apps/frontend`)
- **Backend**: Railway (`apps/backend`)
- Set environment variables from `.env.example` on both platforms

## Development notes

- Without `TELEGRAM_BOT_TOKEN`, auth accepts dev initData for local testing
- Sample videos use public test MP4 URLs (not Instagram API)
- For production Instagram content, integrate Instagram Graph API / oEmbed per TZ
