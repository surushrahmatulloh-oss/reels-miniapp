import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFeed } from '@/api/client';
import { useFeedStore } from '@/store';
import { useSocket } from '@/hooks';
import { ReelsPlayer } from '@/components/ReelsPlayer';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';

export function FeedPage() {
  useSocket();

  const videos = useFeedStore((s) => s.videos);
  const nextCursor = useFeedStore((s) => s.nextCursor);
  const hasMore = useFeedStore((s) => s.hasMore);
  const setVideos = useFeedStore((s) => s.setVideos);
  const setPagination = useFeedStore((s) => s.setPagination);

  const { isLoading, isFetching } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const data = await getFeed({ limit: 15, format: 'reels' });
      setVideos(data.videos);
      setPagination(data.nextCursor, data.hasMore);
      return data;
    },
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetching || !nextCursor) return;
    const data = await getFeed({ limit: 15, cursor: nextCursor, format: 'reels' });
    setVideos(data.videos, true);
    setPagination(data.nextCursor, data.hasMore);
  }, [hasMore, isFetching, nextCursor, setVideos, setPagination]);

  if (isLoading) {
    return <LoadingScreen message="Лента бор мешавад..." />;
  }

  return (
    <div className="relative h-full pb-16">
      <ReelsPlayer videos={videos} onLoadMore={() => void loadMore()} />
      <BottomNav />
    </div>
  );
}
