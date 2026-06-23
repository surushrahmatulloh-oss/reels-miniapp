import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUsers, searchVideos } from '@/api/client';
import { BottomNav } from '@/components/BottomNav';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

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

  return (
    <div className="flex h-full flex-col pb-20">
      <div className="px-4 pt-4">
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Ҷустуҷӯи корбар ё видё..."
          className="w-full rounded-xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/40"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {debounced.length < 2 && (
          <p className="py-8 text-center text-sm text-white/50">
            Ҳадди ақал 2 ҳарф нависед
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

        {videos.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white/60">Видёҳо</h2>
            <div className="grid grid-cols-2 gap-2">
              {videos.map((v) => (
                <div key={v.id} className="overflow-hidden rounded-xl bg-white/5">
                  <img src={v.thumbnailUrl} alt="" className="aspect-[9/16] w-full object-cover" />
                  <p className="truncate p-2 text-xs">{v.caption}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {debounced.length >= 2 && users.length === 0 && videos.length === 0 && (
          <p className="py-8 text-center text-sm text-white/50">Натиҷа ёфт нашуд</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
