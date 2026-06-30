import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsers, searchVideos } from '@/api/client';
import { useAuthStore, useFeedStore } from '@/store';
import { BottomNav } from '@/components/BottomNav';
import { VideoGridTile } from '@/components/VideoGridTile';
import { SearchSkeleton } from '@/components/Skeleton';
import { toVideo } from '@/utils/video';
import { buildSearchQuery, resolveCategoryQuery } from '@/utils/categorySearch';
import { CATEGORIES } from '@/types';
import type { Video } from '@/types';
import { IconSearch } from '@/components/icons/InstagramIcons';

export function SearchPage() {
  const user = useAuthStore((s) => s.user);
  const userCategories = user?.preferences.categories ?? [];
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(
    () => userCategories[0] ?? null,
  );
  const [debounced, setDebounced] = useState('');
  const openPlayback = useFeedStore((s) => s.openPlayback);

  useEffect(() => {
    if (!activeCategory && userCategories[0]) {
      setActiveCategory(userCategories[0] ?? null);
    }
  }, [activeCategory, userCategories]);

  const resolvedCategory = resolveCategoryQuery(debounced);
  const isTextSearch = debounced.length >= 1;

  const handleSearchInput = (value: string) => {
    setQuery(value);
    window.clearTimeout((handleSearchInput as unknown as { timer?: number }).timer);
    (handleSearchInput as unknown as { timer?: number }).timer = window.setTimeout(
      () => setDebounced(value.trim()),
      200,
    );
  };

  const exploreQuery = activeCategory ?? userCategories[0] ?? 'music';

  const {
    data: exploreVideos = [],
    isLoading: exploreLoading,
    isError: exploreError,
    error: exploreErr,
    refetch: refetchExplore,
  } = useQuery({
    queryKey: ['search-explore', exploreQuery],
    queryFn: () => searchVideos(exploreQuery),
    staleTime: 60_000,
    enabled: !isTextSearch,
  });

  const searchQ = buildSearchQuery(debounced, activeCategory);
  const searchCategory = resolvedCategory ?? (activeCategory && isTextSearch ? activeCategory : undefined);

  const {
    data: users = [],
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['search-users', debounced],
    queryFn: () => searchUsers(debounced),
    enabled: isTextSearch && debounced.length >= 2 && !resolvedCategory,
  });

  const {
    data: videos = [],
    isLoading: searchLoading,
    isError: searchError,
    error: searchErr,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['search-videos', searchQ, searchCategory],
    queryFn: () => searchVideos(searchQ, searchCategory),
    enabled: isTextSearch,
  });

  const rawList = isTextSearch ? videos : exploreVideos;
  const videoList: Video[] = rawList.map((v) => toVideo(v));
  const listLoading = isTextSearch ? searchLoading : exploreLoading;
  const listError = isTextSearch ? searchError : exploreError;
  const listErr = isTextSearch ? searchErr : exploreErr;
  const refetchList = isTextSearch ? refetchSearch : refetchExplore;

  const openVideo = (index: number) => {
    openPlayback(videoList, index);
  };

  const selectCategory = (catId: string) => {
    setActiveCategory(catId);
    setQuery('');
    setDebounced('');
  };

  return (
    <div className="flex h-full flex-col bg-black pb-14">
      <div className="sticky top-0 z-10 border-b border-ig-border bg-black px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-ig-surface px-3 py-2.5">
          <IconSearch className="h-5 w-5 text-ig-muted" />
          <input
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Ҷустуҷӯ: Футбол, Мусиқӣ, hashtag..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ig-muted"
          />
        </div>
        {resolvedCategory && (
          <p className="mt-2 text-xs text-ig-accent">
            Категория: {CATEGORIES.find((c) => c.id === resolvedCategory)?.label ?? resolvedCategory}
          </p>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const isFav = userCategories.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === cat.id
                  ? 'border-ig-accent bg-ig-accent/15 text-white'
                  : isFav
                    ? 'border-ig-accent/50 text-white'
                    : 'border-ig-border text-ig-muted'
              }`}
            >
              {cat.emoji} {cat.label}
              {isFav ? ' ★' : ''}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {(listError || usersError) && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center">
            <p className="text-sm text-red-300">
              {listErr instanceof Error ? listErr.message : 'Хатогии ҷустуҷӯ'}
            </p>
            <button
              type="button"
              onClick={() => {
                void refetchList();
                if (usersError) void refetchUsers();
              }}
              className="mt-2 text-xs font-semibold text-white underline"
            >
              Боз кӯшиш
            </button>
          </div>
        )}

        {isTextSearch && users.length > 0 && (
          <section className="border-b border-ig-border px-4 py-3">
            <h2 className="mb-2 text-xs font-semibold uppercase text-ig-muted">Корбарон</h2>
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <img
                  src={u.avatarUrl || 'https://i.pravatar.cc/40'}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{u.displayName || u.username}</p>
                  <p className="text-xs text-ig-muted">@{u.username}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {listLoading && videoList.length === 0 ? (
          <SearchSkeleton />
        ) : videoList.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {videoList.map((video, index) => (
              <VideoGridTile key={video.id} video={video} onClick={() => openVideo(index)} />
            ))}
          </div>
        ) : !listLoading && !listError ? (
          <p className="py-16 text-center text-sm text-ig-muted">
            {isTextSearch ? 'Натиҷа ёфт нашуд' : 'Видё нест — категорияи дигар интихоб кунед'}
          </p>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
}
