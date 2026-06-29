import { useRef, useEffect, useCallback, useState, type ReactNode } from 'react';
import type { Video } from '@/types';
import { getPlayableUrl } from '@/utils/video';
import {
  likeVideo,
  unlikeVideo,
  saveVideo,
  unsaveVideo,
  shareVideo,
  markVideoViewed,
} from '@/api/client';
import { useFeedStore } from '@/store';
import { CommentsSheet } from './CommentsSheet';
import {
  IconHeart,
  IconComment,
  IconShare,
  IconBookmark,
  IconMusic,
} from '@/components/icons/InstagramIcons';

interface ReelsPlayerProps {
  videos: Video[];
  onLoadMore?: () => void;
  startIndex?: number;
  controlledIndex?: number;
  onIndexChange?: (index: number) => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

async function tryPlay(video: HTMLVideoElement, muted: boolean): Promise<boolean> {
  video.muted = muted;
  try {
    await video.play();
    return true;
  } catch {
    if (!muted) {
      video.muted = true;
      try {
        await video.play();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function ReelsPlayer({
  videos,
  onLoadMore,
  startIndex = 0,
  controlledIndex,
  onIndexChange,
}: ReelsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const lastTapRef = useRef(0);
  const [heartAnim, setHeartAnim] = useState<{ x: number; y: number } | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  const storeIndex = useFeedStore((s) => s.currentIndex);
  const setStoreIndex = useFeedStore((s) => s.setCurrentIndex);
  const currentIndex = controlledIndex ?? storeIndex;
  const setCurrentIndex = onIndexChange ?? setStoreIndex;
  const isMuted = useFeedStore((s) => s.isMuted);
  const updateVideo = useFeedStore((s) => s.updateVideo);
  const toggleMute = useFeedStore((s) => s.toggleMute);

  useEffect(() => {
    if (startIndex > 0) {
      setCurrentIndex(startIndex);
      const container = containerRef.current;
      if (container) {
        container.scrollTop = startIndex * container.clientHeight;
      }
    }
  }, [startIndex, setCurrentIndex]);

  const currentVideo = videos[currentIndex];

  const playVideo = useCallback(
    async (index: number) => {
      let started = false;
      for (const [i, video] of videoRefs.current) {
        if (i === index) {
          started = await tryPlay(video, isMuted);
          if (started) setPlayingIndex(index);
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
      setNeedsTap(!started);
    },
    [isMuted],
  );

  useEffect(() => {
    void playVideo(currentIndex);
    const video = videos[currentIndex];
    if (!video) return;

    const timer = window.setTimeout(() => {
      void markVideoViewed(video.id);
    }, 2000);

    if (currentIndex >= videos.length - 3 && onLoadMore) {
      onLoadMore();
    }

    return () => window.clearTimeout(timer);
  }, [currentIndex, videos, playVideo, onLoadMore]);

  useEffect(() => {
    const el = videoRefs.current.get(currentIndex);
    if (el) void tryPlay(el, isMuted);
  }, [isMuted, currentIndex]);

  useEffect(() => {
    const prefetchIndexes = [currentIndex + 1, currentIndex + 2, currentIndex + 3];
    prefetchIndexes.forEach((i) => {
      const v = videos[i];
      if (v) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = getPlayableUrl(v);
        link.as = 'video';
        document.head.appendChild(link);
      }
    });
  }, [currentIndex, videos]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== currentIndex && index >= 0 && index < videos.length) {
      setCurrentIndex(index);
      onIndexChange?.(index);
    }
  };

  const handleDoubleTap = async (e: React.MouseEvent | React.TouchEvent, video: Video) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!video.isLiked) {
        const result = await likeVideo(video.id);
        updateVideo(video.id, { isLiked: true, likes: result.likeCount });
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0]?.clientX ?? rect.width / 2 : e.clientX;
        const clientY = 'touches' in e ? e.touches[0]?.clientY ?? rect.height / 2 : e.clientY;
        setHeartAnim({ x: clientX, y: clientY });
        setTimeout(() => setHeartAnim(null), 600);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleTap = (index: number) => {
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 280) {
        const el = videoRefs.current.get(index);
        if (!el) return;
        if (el.paused || needsTap) {
          void tryPlay(el, isMuted).then((ok) => {
            setNeedsTap(!ok);
            if (ok) setPlayingIndex(index);
          });
        } else {
          el.pause();
          setPlayingIndex(null);
        }
      }
    }, 300);
  };

  const handleLike = async (video: Video) => {
    if (video.isLiked) {
      const result = await unlikeVideo(video.id);
      updateVideo(video.id, { isLiked: false, likes: result.likeCount });
    } else {
      const result = await likeVideo(video.id);
      updateVideo(video.id, { isLiked: true, likes: result.likeCount });
    }
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  };

  const handleSave = async (video: Video) => {
    if (video.isSaved) {
      await unsaveVideo(video.id);
      updateVideo(video.id, { isSaved: false, savesCount: video.savesCount - 1 });
    } else {
      await saveVideo(video.id);
      updateVideo(video.id, { isSaved: true, savesCount: video.savesCount + 1 });
    }
  };

  const handleShare = async (video: Video) => {
    const { shareUrl } = await shareVideo(video.id);
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`);
    } else if (navigator.share) {
      await navigator.share({ url: shareUrl, title: video.caption });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  if (!currentVideo) {
    return (
      <div className="flex h-full items-center justify-center text-white/50">
        Видё нест — лентаро навсозӣ кунед
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="relative h-full w-full snap-start snap-always bg-black"
            onClick={() => handleTap(index)}
            onTouchEnd={(e) => handleDoubleTap(e, video)}
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(index, el);
              }}
              src={getPlayableUrl(video)}
              poster={video.thumbnailUrl || undefined}
              className="h-full w-full object-cover"
              loop
              playsInline
              autoPlay={index === currentIndex}
              muted={isMuted}
              preload={index === currentIndex ? 'auto' : 'metadata'}
              onLoadedData={() => {
                if (index === currentIndex) void playVideo(index);
              }}
              onCanPlay={() => {
                if (index === currentIndex) void playVideo(index);
              }}
              onPlaying={() => {
                setPlayingIndex(index);
                setNeedsTap(false);
              }}
              onError={() => {
                if (index === currentIndex) setNeedsTap(true);
              }}
            />

            {needsTap && index === currentIndex && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-black/50 px-4 py-2 text-sm">▶ Пахш кунед</span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

            <div className="absolute bottom-20 left-4 right-16">
              <div className="mb-2 flex items-center gap-2">
                <img
                  src={video.authorAvatar || 'https://i.pravatar.cc/40'}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white/30 object-cover"
                />
                <span className="text-sm font-semibold">@{video.authorName.replace(/\s+/g, '').toLowerCase() || 'creator'}</span>
              </div>
              <p className="line-clamp-2 text-sm">{video.caption}</p>
              {video.hashtags?.length > 0 && (
                <p className="mt-1 line-clamp-1 text-xs text-white/80">
                  {video.hashtags.map((h) => `#${h}`).join(' ')}
                </p>
              )}
              {video.musicTitle && (
                <p className="mt-2 flex items-center gap-1.5 text-xs">
                  <IconMusic className="h-3 w-3 animate-pulse" />
                  <span className="truncate">{video.musicTitle}</span>
                </p>
              )}
            </div>

            <div className="absolute bottom-24 right-2 flex flex-col items-center gap-5">
              <ActionButton
                icon={<IconHeart className="h-7 w-7" filled={video.isLiked} />}
                active={video.isLiked}
                count={formatCount(video.likes)}
                onClick={() => void handleLike(video)}
              />
              <ActionButton
                icon={<IconComment className="h-7 w-7" />}
                count={formatCount(video.commentsCount)}
                onClick={() => setCommentsOpen(true)}
              />
              <ActionButton
                icon={<IconShare className="h-7 w-7" />}
                count={formatCount(video.sharesCount)}
                onClick={() => void handleShare(video)}
              />
              <ActionButton
                icon={<IconBookmark className="h-7 w-7" filled={video.isSaved} />}
                active={video.isSaved}
                count={formatCount(video.savesCount)}
                onClick={() => void handleSave(video)}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextMuted = !isMuted;
                  toggleMute();
                  const el = videoRefs.current.get(currentIndex);
                  if (el) {
                    el.muted = nextMuted;
                    void el.play().catch(() => undefined);
                  }
                }}
                className="text-xl opacity-90"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {heartAnim && (
        <div
          className="pointer-events-none fixed z-50 animate-heart-pop text-6xl"
          style={{ left: heartAnim.x - 30, top: heartAnim.y - 30 }}
        >
          ❤️
        </div>
      )}

      <CommentsSheet
        videoId={currentVideo.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </>
  );
}

function ActionButton({
  icon,
  count,
  onClick,
  active,
}: {
  icon: ReactNode;
  count: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex flex-col items-center gap-0.5 ${active ? 'text-red-500' : 'text-white'}`}
    >
      <span className="drop-shadow-lg">{icon}</span>
      <span className="text-[11px] font-semibold drop-shadow">{count}</span>
    </button>
  );
}
