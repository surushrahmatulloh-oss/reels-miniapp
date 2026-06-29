import { BottomNav } from '@/components/BottomNav';

export function NotificationsPage() {
  const items = [
    { id: 1, text: 'Кто-то лайк кард видёи шуморо', time: '2соат', emoji: '❤️' },
    { id: 2, text: 'Комментарий ба видёи шумо', time: '5соат', emoji: '💬' },
    { id: 3, text: 'Подписчик нав', time: '1р', emoji: '👤' },
    { id: 4, text: 'Видёи нав дар категорияи music', time: '2р', emoji: '🎵' },
  ];

  return (
    <div className="flex h-full flex-col bg-black pb-20">
      <header className="border-b border-ig-border px-4 py-3">
        <h1 className="text-lg font-semibold">Огоҳиҳо</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border-b border-ig-border/50 px-4 py-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ig-surface text-lg">
              {item.emoji}
            </span>
            <div className="flex-1">
              <p className="text-sm">{item.text}</p>
              <p className="text-xs text-ig-muted">{item.time} пеш</p>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
