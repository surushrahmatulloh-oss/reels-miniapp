import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFeed } from '@/api/client';
import { useFeedStore } from '@/store';
import { useSocket } from '@/hooks';
import { ReelsPlayer } from '@/components/ReelsPlayer';
import { BottomNav } from '@/components/BottomNav';
import { StoriesBar } from '@/components/StoriesBar';
import { FeedSkeleton } from '@/components/Skeleton';

const APP_VERSION = '3.0.0';

export function FeedPage() {
  useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const prev = localStorage.getItem('reels_app_version');
    if (prev !== APP_VERSION) {
      localStorage.setItem('reels_app_version', APP_VERSION);
      useFeedStore.getState().setVideos([]);
      useFeedStore.getState().setCurrentIndex(0);
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  }, [queryClient]);

  const videos = useFeedStore((s) => s.videos);
  const nextCursor = useFeedStore((s) => s.nextCursor);
  const hasMore = useFeedStore((s) => s.hasMore);
  const setVideos = useFeedStore((s) => s.setVideos);
  const setPagination = useFeedStore((s) => s.setPagination);

  const { isLoading, isFetching } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const data = await getFeed({ limit: 15, format: 'reels' });
      if (useFeedStore.getState().videos.length === 0) {
        setVideos(data.videos);
        setPagination(data.nextCursor, data.hasMore);
      }
      return data;
    },
    staleTime: 60_000,
    refetchOnMount: false,
  });

  const loadMore = useCallback(async () => {
    if (!hasMore || isFetching || !nextCursor) return;
    const data = await getFeed({ limit: 15, cursor: nextCursor, format: 'reels' });
    setVideos(data.videos, true);
    setPagination(data.nextCursor, data.hasMore);
  }, [hasMore, isFetching, nextCursor, setVideos, setPagination]);

  if (isLoading && videos.length === 0) {
    return (
      <div className="relative h-full pb-14">
        <FeedSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-black pb-14">
      <StoriesBar videos={videos} />
      <div className="relative min-h-0 flex-1">
        <ReelsPlayer videos={videos} onLoadMore={() => void loadMore()} />
      </div>
      <BottomNav />
    </div>
  );
}
