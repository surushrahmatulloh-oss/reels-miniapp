import { useEffect, useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getFeed } from '@/api/client';
import { useAuthStore, useFeedStore } from '@/store';
import { useSocket } from '@/hooks';
import { ReelsPlayer } from '@/components/ReelsPlayer';
import { BottomNav } from '@/components/BottomNav';
import { FeedSkeleton } from '@/components/Skeleton';

const APP_VERSION = '5.1.0';

export function ReelsPage() {
  useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadingMoreRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const activeCategories = useFeedStore((s) => s.activeCategories);
  const feedCategories =
    activeCategories?.length ? activeCategories : user?.preferences.categories ?? [];

  useEffect(() => {
    if (feedCategories.length === 0) {
      navigate('/categories', { replace: true });
    }
  }, [feedCategories.length, navigate]);

  useEffect(() => {
    const prev = localStorage.getItem('reels_app_version');
    if (prev !== APP_VERSION) {
      localStorage.setItem('reels_app_version', APP_VERSION);
      localStorage.removeItem('reels:muted');
      useFeedStore.getState().setVideos([]);
      useFeedStore.getState().setCurrentIndex(0);
      useFeedStore.getState().setPagination(null, true);
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  }, [queryClient]);

  const videos = useFeedStore((s) => s.videos);
  const nextCursor = useFeedStore((s) => s.nextCursor);
  const hasMore = useFeedStore((s) => s.hasMore);
  const setVideos = useFeedStore((s) => s.setVideos);
  const setPagination = useFeedStore((s) => s.setPagination);

  const feedKey = ['feed', feedCategories.join(',')] as const;

  const { isLoading, isError, refetch } = useQuery({
    queryKey: feedKey,
    queryFn: async () => {
      const data = await getFeed({
        limit: 20,
        format: 'reels',
        categories: feedCategories.length ? feedCategories : undefined,
      });
      setVideos(data.videos);
      setPagination(data.nextCursor, data.hasMore);
      setLoadError(null);
      return data;
    },
    staleTime: 30_000,
    refetchOnMount: 'always',
    enabled: feedCategories.length > 0,
  });

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !nextCursor) return;
    loadingMoreRef.current = true;
    try {
      const loadedIds = useFeedStore.getState().videos.map((v) => v.id);
      const data = await getFeed({
        limit: 20,
        cursor: nextCursor,
        format: 'reels',
        categories: feedCategories.length ? feedCategories : undefined,
        excludeIds: loadedIds,
      });
      if (data.videos.length > 0) {
        setVideos(data.videos, true);
        setPagination(data.nextCursor, data.hasMore);
      } else {
        setPagination(null, false);
      }
    } catch {
      setLoadError('Боргирии видёҳои навбати ноком шуд');
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, nextCursor, setVideos, setPagination, feedCategories]);

  if (feedCategories.length === 0) {
    return null;
  }

  if (isLoading && videos.length === 0) {
    return (
      <div className="reels-viewport bg-black pb-[52px]">
        <FeedSkeleton />
        <BottomNav />
      </div>
    );
  }

  if ((isError || videos.length === 0) && !isLoading) {
    return (
      <div className="reels-viewport flex flex-col items-center justify-center gap-4 bg-black pb-[52px] text-white/70">
        <p>{loadError ?? 'Видё дар ин категория нест.'}</p>
        <button
          type="button"
          onClick={() => navigate('/categories')}
          className="rounded-lg border border-ig-border px-4 py-2 text-sm"
        >
          Категория иваз кунед
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg bg-ig-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Боз кӯшиш
        </button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="reels-viewport relative bg-black pb-[52px]">
      <ReelsPlayer videos={videos} onLoadMore={() => void loadMore()} immersive />
      <BottomNav />
    </div>
  );
}
