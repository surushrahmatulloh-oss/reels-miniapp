import { BottomNav } from '@/components/BottomNav';
import { StoriesBar } from '@/components/StoriesBar';
import { VideoGridTile } from '@/components/VideoGridTile';
import { useQuery } from '@tanstack/react-query';
import { searchVideos } from '@/api/client';
import { useFeedStore } from '@/store';
import { toVideo } from '@/utils/video';
import { useNavigate } from 'react-router-dom';

export function FeedPage() {
  const navigate = useNavigate();
  const openPlayback = useFeedStore((s) => s.openPlayback);

  const { data: exploreVideos = [] } = useQuery({
    queryKey: ['home-explore'],
    queryFn: () => searchVideos('reels'),
    staleTime: 120_000,
  });

  const videos = exploreVideos.slice(0, 9).map((v) => toVideo(v));

  const openVideo = (index: number) => {
    if (videos.length > 0) openPlayback(videos, index);
    else navigate('/reels');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-black pb-14">
      <header className="sticky top-0 z-10 flex items-center justify-center border-b border-ig-border bg-black px-4 py-3">
        <h1 className="font-semibold tracking-tight">
          <span className="ig-gradient-text text-xl italic">Instagram</span>
        </h1>
      </header>

      <StoriesBar videos={videos} />

      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/reels')}
          className="flex w-full items-center justify-between rounded-xl bg-ig-surface px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold">Reels барои шумо</p>
            <p className="text-xs text-ig-muted">Swipe боло/поён — видёҳои нав</p>
          </div>
          <span className="rounded-full bg-ig-accent px-3 py-1 text-xs font-semibold text-white">
            Кушодан →
          </span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {videos.map((video, index) => (
          <VideoGridTile key={video.id} video={video} onClick={() => openVideo(index)} />
        ))}
      </div>

      {videos.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-ig-muted">Видёҳо бор мешаванд...</p>
          <button
            type="button"
            onClick={() => navigate('/reels')}
            className="rounded-lg bg-ig-accent px-6 py-2 text-sm font-semibold"
          >
            Reels кушодан
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
