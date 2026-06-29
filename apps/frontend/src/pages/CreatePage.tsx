import { BottomNav } from '@/components/BottomNav';
import { IconReels } from '@/components/icons/InstagramIcons';

export function CreatePage() {
  return (
    <div className="flex h-full flex-col bg-black pb-20">
      <header className="border-b border-ig-border px-4 py-3">
        <h1 className="text-lg font-semibold">Илова кардан</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-ig-border">
          <IconReels className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-semibold">Reels илова кунед</h2>
        <p className="text-sm text-ig-muted">
          Ба зудӣ имконияти боргузории видё аз Telegram илова мешавад
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
