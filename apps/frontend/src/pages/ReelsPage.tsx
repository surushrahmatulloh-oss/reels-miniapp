import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getFeed } from '@/api/client';
import { useAuthStore, useFeedStore } from '@/store';
import { useSocket } from '@/hooks';
import { ReelsPlayer } from '@/components/ReelsPlayer';
import { BottomNav } from '@/components/BottomNav';
import { FeedSkeleton } from '@/components/Skeleton';
import { videoMatchesCategories } from '@/utils/categoryFilter';

const APP_VERSION = '5.4.1';

export function ReelsPage() {
  useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadingMoreRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const activeCategories = useFeedStore((s) => s.activeCategories);
  const feedCategories =
    activeCategories?.length
      ? activeCategories
      : user?.preferences.categories ?? [];

  const feedKeyStr = feedCategories.join(',');

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
      sessionStorage.removeItem('reels:soundUnlocked');
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
  const setCurrentIndex = useFeedStore((s) => s.setCurrentIndex);

  const feedKey = ['feed', feedKeyStr] as const;

  useEffect(() => {
    setVideos([]);
    setCurrentIndex(0);
    setPagination(null, true);
  }, [feedKeyStr, setVideos, setCurrentIndex, setPagination]);

  const { isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: feedKey,
    queryFn: async () => {
      const data = await getFeed({
        limit: 20,
        format: 'reels',
        categories: feedCategories,
      });
      const filtered = data.videos
        .filter((v) => videoMatchesCategories(v, feedCategories))
        .sort((a, b) => Number(b.hasAudio) - Number(a.hasAudio));
      const withSound = filtered.filter((v) => v.hasAudio !== false);
      const display = withSound.length > 0 ? withSound : filtered;
      setVideos(display);
      setPagination(data.nextCursor, data.hasMore);
      setLoadError(null);
      return { ...data, videos: display };
    },
    staleTime: 15_000,
    enabled: feedCategories.length > 0,
  });

  const displayVideos = useMemo(
    () => videos.filter((v) => videoMatchesCategories(v, feedCategories)),
    [videos, feedCategories],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !nextCursor) return;
    loadingMoreRef.current = true;
    try {
      const loadedIds = useFeedStore.getState().videos.map((v) => v.id);
      const data = await getFeed({
        limit: 20,
        cursor: nextCursor,
        format: 'reels',
        categories: feedCategories,
        excludeIds: loadedIds,
      });
      const filtered = data.videos.filter((v) => videoMatchesCategories(v, feedCategories));
      if (filtered.length > 0) {
        setVideos(filtered, true);
        setPagination(data.nextCursor, data.hasMore);
      } else if (data.hasMore && data.nextCursor) {
        setPagination(data.nextCursor, true);
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

  if ((isLoading || isFetching) && displayVideos.length === 0) {
    return (
      <div className="reels-viewport bg-black pb-[52px]">
        <FeedSkeleton />
        <BottomNav />
      </div>
    );
  }

  if ((isError || displayVideos.length === 0) && !isLoading && !isFetching) {
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
      <ReelsPlayer videos={displayVideos} onLoadMore={() => void loadMore()} immersive />
      <BottomNav />
    </div>
  );
}
