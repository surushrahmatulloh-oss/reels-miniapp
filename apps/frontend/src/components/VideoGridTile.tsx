import { useEffect, useRef, useState } from 'react';
import type { Video } from '@/types';
import { getPlayableUrl } from '@/utils/video';

const CATEGORY_GRADIENT: Record<string, string> = {
  cars: 'from-zinc-900 via-stone-700 to-amber-600',
  sport: 'from-emerald-900 via-green-700 to-lime-500',
  football: 'from-green-900 via-emerald-700 to-lime-500',
  music: 'from-violet-900 via-fuchsia-800 to-pink-600',
  cinema: 'from-purple-900 via-violet-700 to-indigo-500',
  tech: 'from-slate-900 via-blue-800 to-cyan-600',
  gaming: 'from-indigo-900 via-purple-800 to-violet-600',
  comedy: 'from-orange-900 via-amber-700 to-yellow-500',
  news: 'from-gray-900 via-slate-700 to-blue-600',
  nature: 'from-teal-900 via-green-800 to-emerald-500',
  travel: 'from-blue-900 via-indigo-700 to-cyan-500',
  cooking: 'from-orange-900 via-red-800 to-amber-500',
  food: 'from-orange-900 via-amber-700 to-yellow-500',
  fashion: 'from-rose-900 via-pink-700 to-fuchsia-500',
  technology: 'from-slate-900 via-blue-800 to-cyan-600',
  animation: 'from-purple-900 via-violet-700 to-indigo-500',
  entertainment: 'from-red-900 via-orange-800 to-amber-500',
  education: 'from-indigo-900 via-blue-800 to-sky-500',
  business: 'from-zinc-900 via-stone-700 to-amber-600',
  science: 'from-cyan-900 via-teal-800 to-blue-500',
};

interface VideoGridTileProps {
  video: Video;
  onClick: () => void;
}

export function VideoGridTile({ video, onClick }: VideoGridTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLButtonElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const gradient = CATEGORY_GRADIENT[video.category] ?? 'from-gray-900 to-gray-700';
  const poster = video.thumbnailUrl || undefined;

  useEffect(() => {
    const el = rootRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void vid.play().then(() => setIsPlaying(true)).catch(() => setVideoFailed(true));
        } else {
          vid.pause();
          vid.currentTime = 0;
          setIsPlaying(false);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={onClick}
      className={`group relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-gradient-to-br ${gradient} text-left`}
    >
      {videoFailed && poster ? (
        <img
          src={poster}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <video
          ref={videoRef}
          src={getPlayableUrl(video)}
          poster={poster}
          muted
          playsInline
          loop
          preload="metadata"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          onPlaying={() => setIsPlaying(true)}
          onError={() => setVideoFailed(true)}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {!isPlaying && !videoFailed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/40 px-3 py-1.5 text-base backdrop-blur-sm">▶</span>
        </div>
      )}
      <p className="pointer-events-none absolute bottom-2 left-2 right-2 line-clamp-2 text-xs font-medium drop-shadow">
        {video.caption}
      </p>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px]">
        ❤️ {video.likes >= 1000 ? `${(video.likes / 1000).toFixed(1)}K` : video.likes}
      </span>
    </button>
  );
}
