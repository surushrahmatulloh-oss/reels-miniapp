import { createPortal } from 'react-dom';
import { ReelsPlayer } from './ReelsPlayer';
import { useFeedStore } from '@/store';

export function ReelsOverlay() {
  const playbackOpen = useFeedStore((s) => s.playbackOpen);
  const playbackVideos = useFeedStore((s) => s.playbackVideos);
  const playbackIndex = useFeedStore((s) => s.playbackIndex);
  const closePlayback = useFeedStore((s) => s.closePlayback);
  const setCurrentIndex = useFeedStore((s) => s.setCurrentIndex);

  if (!playbackOpen || playbackVideos.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black">
      <button
        type="button"
        onClick={closePlayback}
        className="absolute right-4 top-4 z-[10000] flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-xl backdrop-blur"
        aria-label="Пӯшидан"
      >
        ✕
      </button>
      <ReelsPlayer
        videos={playbackVideos}
        startIndex={playbackIndex}
        onIndexChange={setCurrentIndex}
      />
    </div>,
    document.body,
  );
}
