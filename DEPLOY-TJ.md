# Deploy — бе пул (Render.com)

## 1. GitHub
Лоиҳаро ба GitHub suborед (repo-и хусусӣ ё оммавӣ).

## 2. Render.com (бесплатно)
1. Дар [render.com](https://render.com) ҳисоб кунед
2. **New → Blueprint** → repo-ро интихоб кунед (`render.yaml` хонда мешавад)
3. **Environment** → `TELEGRAM_BOT_TOKEN`-ро гузоред
4. Deploy → URL мегиред, мисол: `https://reels-miniapp.onrender.com`

## 3. Telegram Bot
```bash
node setup-bot.js https://reels-miniapp.onrender.com
```
Ё дар BotFather → Web App URL → ҳамин URL.

## 4. Муҳим
- Render **free** — сервер пас аз 15 дақиқа бе истифода хоб меравад (аввалин кушодан 30–60 сония).
- Профилҳо ва лайкҳо дар `data/memory-store.json` нигоҳ дошта мешаванд.
- Барои доимӣ онлайн — Render paid ё Railway.

## Локалӣ (Docker)
```bash
docker build -t reels-miniapp .
docker run -p 3001:3001 -e TELEGRAM_BOT_TOKEN=xxx reels-miniapp
```
