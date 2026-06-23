const token = process.env.TELEGRAM_BOT_TOKEN || '8831164657:AAFveXmy0NAgUSvvxBE5wQ2-2Ad9seQci5I';
const url = process.argv[2] || 'https://reelsmini8831164657.loca.lt';

async function main() {
  const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      menu_button: {
        type: 'web_app',
        text: '🎬 Reels',
        web_app: { url },
      },
    }),
  });
  const data = await res.json();
  console.log('setChatMenuButton:', JSON.stringify(data));

  const check = await fetch(`https://api.telegram.org/bot${token}/getChatMenuButton`);
  console.log('getChatMenuButton:', await check.text());
}

main().catch(console.error);
