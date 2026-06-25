import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsers, searchVideos } from '@/api/client';
import { useFeedStore } from '@/store';
import { BottomNav } from '@/components/BottomNav';
import { VideoGridTile } from '@/components/VideoGridTile';
import { toVideo } from '@/utils/video';
import type { Video } from '@/types';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const openPlayback = useFeedStore((s) => s.openPlayback);

  const handleSearch = (value: string) => {
    setQuery(value);
    window.clearTimeout((handleSearch as unknown as { timer?: number }).timer);
    (handleSearch as unknown as { timer?: number }).timer = window.setTimeout(
      () => setDebounced(value.trim()),
      400,
    );
  };

  const { data: users = [] } = useQuery({
    queryKey: ['search-users', debounced],
    queryFn: () => searchUsers(debounced),
    enabled: debounced.length >= 2,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['search-videos', debounced],
    queryFn: () => searchVideos(debounced),
    enabled: debounced.length >= 2,
  });

  const videoList: Video[] = videos.map((v) => toVideo(v));

  const openVideo = (index: number) => {
    openPlayback(videoList, index);
  };

  return (
    <div className="flex h-full flex-col pb-20">
      <div className="px-4 pt-4">
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Ҷустуҷӯ: мусиқӣ, sport, travel..."
          className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/40"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {debounced.length < 2 && (
          <p className="py-8 text-center text-sm text-white/50">
            Ҳадди ақал 2 ҳарф нависед (категория, hashtag, ном)
          </p>
        )}

        {users.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-white/60">Корбарон</h2>
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-3">
                <img
                  src={u.avatarUrl || 'https://i.pravatar.cc/40'}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{u.displayName || u.username}</p>
                  <p className="text-sm text-white/50">@{u.username}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {videoList.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white/60">Видёҳо</h2>
            <div className="grid grid-cols-2 gap-2">
              {videoList.map((video, index) => (
                <VideoGridTile
                  key={video.id}
                  video={video}
                  onClick={() => openVideo(index)}
                />
              ))}
            </div>
          </section>
        )}

        {debounced.length >= 2 && users.length === 0 && videoList.length === 0 && (
          <p className="py-8 text-center text-sm text-white/50">Натиҷа ёфт нашуд</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
