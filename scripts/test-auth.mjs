const initData =
  'user=%7B%22id%22%3A123456789%2C%22username%22%3A%22devuser%22%2C%22first_name%22%3A%22Dev%22%7D&auth_date=1700000000&hash=dev';

const res = await fetch('https://reels-miniapp.onrender.com/api/auth/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData }),
});
console.log('status', res.status);
console.log(await res.text());
