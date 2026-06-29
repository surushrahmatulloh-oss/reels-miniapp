import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsers, searchVideos } from '@/api/client';
import { useFeedStore } from '@/store';
import { BottomNav } from '@/components/BottomNav';
import { VideoGridTile } from '@/components/VideoGridTile';
import { SearchSkeleton } from '@/components/Skeleton';
import { toVideo } from '@/utils/video';
import { CATEGORIES } from '@/types';
import type { Video } from '@/types';
import { IconSearch } from '@/components/icons/InstagramIcons';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const openPlayback = useFeedStore((s) => s.openPlayback);

  const handleSearch = (value: string) => {
    setQuery(value);
    window.clearTimeout((handleSearch as unknown as { timer?: number }).timer);
    (handleSearch as unknown as { timer?: number }).timer = window.setTimeout(
      () => setDebounced(value.trim()),
      350,
    );
  };

  const { data: exploreVideos = [], isLoading: exploreLoading } = useQuery({
    queryKey: ['search-explore'],
    queryFn: () => searchVideos('reels'),
    staleTime: 120_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['search-users', debounced],
    queryFn: () => searchUsers(debounced),
    enabled: debounced.length >= 2,
  });

  const { data: videos = [], isLoading: searchLoading } = useQuery({
    queryKey: ['search-videos', debounced],
    queryFn: () => searchVideos(debounced),
    enabled: debounced.length >= 2,
  });

  const videoList: Video[] = (debounced.length >= 2 ? videos : exploreVideos).map((v) =>
    toVideo(v),
  );

  const openVideo = (index: number) => {
    openPlayback(videoList, index);
  };

  return (
    <div className="flex h-full flex-col bg-black pb-14">
      <div className="sticky top-0 z-10 border-b border-ig-border bg-black px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-ig-surface px-3 py-2">
          <IconSearch className="h-5 w-5 text-ig-muted" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ҷустуҷӯ"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ig-muted"
          />
        </div>
      </div>

      {!debounced && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSearch(cat.id)}
              className="shrink-0 rounded-full border border-ig-border px-3 py-1.5 text-xs"
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {debounced.length >= 2 && users.length > 0 && (
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

        {(searchLoading || exploreLoading) && videoList.length === 0 ? (
          <SearchSkeleton />
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {videoList.map((video, index) => (
              <VideoGridTile key={video.id} video={video} onClick={() => openVideo(index)} />
            ))}
          </div>
        )}

        {debounced.length >= 2 && !searchLoading && users.length === 0 && videoList.length === 0 && (
          <p className="py-16 text-center text-sm text-ig-muted">Натиҷа ёфт нашуд</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
