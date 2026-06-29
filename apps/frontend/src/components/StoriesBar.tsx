import { useMemo } from 'react';
import type { Video } from '@/types';
import { useAuthStore } from '@/store';

interface StoriesBarProps {
  videos: Video[];
}

const STORY_COLORS = [
  'from-yellow-400 via-pink-500 to-purple-600',
  'from-orange-400 via-red-500 to-pink-600',
  'from-green-400 via-cyan-500 to-blue-600',
  'from-purple-400 via-fuchsia-500 to-pink-600',
];

export function StoriesBar({ videos }: StoriesBarProps) {
  const user = useAuthStore((s) => s.user);

  const stories = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ id: string; name: string; avatar: string; category: string }> = [];

    if (user) {
      items.push({
        id: 'your-story',
        name: 'Шумо',
        avatar: user.avatarUrl || `https://i.pravatar.cc/150?u=${user.username}`,
        category: 'you',
      });
    }

    for (const v of videos) {
      const key = v.authorName || v.category;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: v.id,
        name: v.authorName || v.category,
        avatar: v.authorAvatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(key)}`,
        category: v.category,
      });
      if (items.length >= 12) break;
    }

    return items;
  }, [videos, user]);

  if (stories.length === 0) return null;

  return (
    <div className="border-b border-ig-border bg-black px-3 py-3">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {stories.map((story, i) => (
          <button
            key={story.id}
            type="button"
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div
              className={`rounded-full p-[2px] ${
                story.id === 'your-story'
                  ? 'bg-ig-border'
                  : `bg-gradient-to-tr ${STORY_COLORS[i % STORY_COLORS.length]}`
              }`}
            >
              <div className="rounded-full bg-black p-[2px]">
                <img
                  src={story.avatar}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              </div>
            </div>
            <span className="max-w-[64px] truncate text-[11px] text-white">
              {story.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
