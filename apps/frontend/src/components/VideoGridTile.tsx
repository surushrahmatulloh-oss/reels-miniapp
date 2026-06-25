import type { Video } from '@/types';

interface VideoGridTileProps {
  video: Video;
  onClick: () => void;
}

export function VideoGridTile({ video, onClick }: VideoGridTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black text-left"
    >
      <video
        src={video.url}
        muted
        playsInline
        loop
        preload="metadata"
        poster={video.thumbnailUrl}
        className="h-full w-full object-cover"
        onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)}
        onMouseLeave={(e) => {
          e.currentTarget.pause();
          e.currentTarget.currentTime = 0;
        }}
        onTouchStart={(e) => void e.currentTarget.play().catch(() => undefined)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
        <span className="rounded-full bg-black/50 px-3 py-1 text-lg">▶</span>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-2 right-2 line-clamp-2 text-xs font-medium">
        {video.caption}
      </p>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px]">
        ❤️ {video.likes >= 1000 ? `${(video.likes / 1000).toFixed(1)}K` : video.likes}
      </span>
    </button>
  );
}
