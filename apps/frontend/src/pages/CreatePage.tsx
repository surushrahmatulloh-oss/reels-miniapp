import { BottomNav } from '@/components/BottomNav';
import { IconAdd, IconReels } from '@/components/icons/InstagramIcons';

export function CreatePage() {
  return (
    <div className="flex h-full flex-col bg-black pb-14">
      <header className="flex items-center justify-center border-b border-ig-border px-4 py-3">
        <h1 className="text-base font-semibold">Илова кардан</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-ig-border">
            <IconReels className="h-12 w-12 text-white" filled />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ig-accent">
            <IconAdd className="h-5 w-5 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Reels илова кунед</h2>
        <p className="text-sm text-ig-muted">
          Ба зудӣ имконияти боргузории видё аз Telegram Mini App илова мешавад
        </p>
        <button
          type="button"
          className="mt-2 rounded-xl bg-ig-accent px-8 py-3 text-sm font-semibold text-white opacity-60"
          disabled
        >
          Ба зудӣ
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
