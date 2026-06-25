# Deploy ба Render (устувор — бе ngrok)

## Чаро Render?
- ngrok танҳо вақте кор мекунад, ки компютери шумо кушода бошад
- Render **24/7 онлайн** (free: пас аз 15 дақиқа бе истифода хоб меравад, аввалин кушодан ~30 сония)

## Қадамҳо (10 дақиқа)

### 1. GitHub token
1. Дар [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Ҳуқуқ: **repo** ✓
3. Token-ро нусха кунед (`ghp_...`)

### 2. Файл `.env.deploy`
Дар папкаи лоиҳа файл `.env.deploy` созед:
```
GITHUB_TOKEN=ghp_xxxx
TELEGRAM_BOT_TOKEN=your_bot_token_from_.env
```

### 3. Deploy
Двобар клик: **`deploy-to-render.bat`**

Скрипт:
- кодро ба GitHub мефиристад
- Render-ро оғоз мекунад

### 4. Render Dashboard
1. [dashboard.render.com](https://dashboard.render.com) → ворид шавед
2. **New → Blueprint** → repo `reels-miniapp`-ро интихоб кунед
3. `TELEGRAM_BOT_TOKEN`-ро гузоред → **Deploy**

### 5. URL-и Render
Пас аз deploy URL мегиред, мисол:
```
https://reels-miniapp.onrender.com
```

### 6. Telegram бот
```bash
node setup-bot.js https://reels-miniapp.onrender.com
```

---

## Муҳим
- Дар BotFather → Web App URL → ҳамин URL-и Render гузоред
- ngrok дигар лозим нест
- `start.bat` танҳо барои таҳияи маҳаллӣ
