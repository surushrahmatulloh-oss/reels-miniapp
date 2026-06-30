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
import { useSoundUnlock, isSoundUnlocked, unlockSoundGlobal } from '@/hooks';
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
  immersive?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function applyAudio(el: HTMLVideoElement, muted: boolean) {
  el.muted = muted;
  el.volume = muted ? 0 : 1;
}

export function ReelsPlayer({
  videos,
  onLoadMore,
  startIndex = 0,
  controlledIndex,
  onIndexChange,
  immersive = false,
}: ReelsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const lastTapRef = useRef(0);
  const userPausedRef = useRef(false);
  const playTokenRef = useRef(0);
  const isMutedRef = useRef(true);
  const suppressTapUntilRef = useRef(0);

  const [heartAnim, setHeartAnim] = useState<{ x: number; y: number } | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showPlayBtn, setShowPlayBtn] = useState(false);
  const showPlayBtnRef = useRef(false);
  const [showSoundHint, setShowSoundHint] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const storeIndex = useFeedStore((s) => s.currentIndex);
  const setStoreIndex = useFeedStore((s) => s.setCurrentIndex);
  const currentIndex = controlledIndex ?? storeIndex;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const setCurrentIndex = onIndexChange ?? setStoreIndex;

  const updateVideo = useFeedStore((s) => s.updateVideo);
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const scrollRafRef = useRef(0);
  const currentVideoId = videos[currentIndex]?.id;

  const { unlock: unlockSound } = useSoundUnlock();

  const setPlayBtnVisible = useCallback((visible: boolean) => {
    showPlayBtnRef.current = visible;
    setShowPlayBtn(visible);
  }, []);

  const suppressParentTap = useCallback(() => {
    suppressTapUntilRef.current = Date.now() + 450;
  }, []);

  const playAt = useCallback(
    async (index: number, userGesture: boolean): Promise<boolean> => {
      const el = videoRefs.current.get(index);
      const item = videos[index];
      if (!el || !item) return false;

      const token = ++playTokenRef.current;

      for (const [i, v] of videoRefs.current) {
        if (i !== index) {
          v.pause();
          if (i !== currentIndexRef.current) v.currentTime = 0;
        }
      }

      el.playsInline = true;

      if (userGesture) {
        unlockSound();
        unlockSoundGlobal();
        userPausedRef.current = false;
        suppressParentTap();
      }

      const canSound = item.hasAudio !== false;
      const wantSound = canSound && (userGesture || isSoundUnlocked());

      if (wantSound) {
        isMutedRef.current = false;
        setIsMuted(false);
        applyAudio(el, false);
      } else {
        isMutedRef.current = true;
        setIsMuted(true);
        applyAudio(el, true);
      }

      const attempt = async (muted: boolean): Promise<boolean> => {
        applyAudio(el, muted);
        try {
          await el.play();
          return true;
        } catch {
          return false;
        }
      };

      let ok = await attempt(wantSound ? false : true);
      if (!ok && wantSound) {
        ok = await attempt(true);
        if (ok) {
          isMutedRef.current = true;
          setIsMuted(true);
          if (canSound) setShowSoundHint(true);
        }
      }

      if (token !== playTokenRef.current) return false;

      if (ok) {
        setPlayBtnVisible(false);
        if (!el.muted) setShowSoundHint(false);
      } else {
        setPlayBtnVisible(true);
      }

      return ok;
    },
    [videos, unlockSound, suppressParentTap, setPlayBtnVisible],
  );

  const schedulePlay = useCallback(
    (index: number, userGesture: boolean) => {
      requestAnimationFrame(() => {
        void playAt(index, userGesture);
      });
    },
    [playAt],
  );

  const onVideoMounted = useCallback(
    (index: number, el: HTMLVideoElement | null) => {
      if (el) {
        videoRefs.current.set(index, el);
        applyAudio(el, index !== currentIndexRef.current || isMutedRef.current);
        if (index === currentIndexRef.current && !userPausedRef.current) {
          schedulePlay(index, false);
        }
      } else {
        videoRefs.current.delete(index);
      }
    },
    [schedulePlay],
  );

  useEffect(() => {
    if (startIndex > 0) {
      setCurrentIndex(startIndex);
      const container = containerRef.current;
      if (container) container.scrollTop = startIndex * container.clientHeight;
    }
  }, [startIndex, setCurrentIndex]);

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    userPausedRef.current = false;
    setPlayBtnVisible(false);
    schedulePlay(currentIndex, false);

    const video = videos[currentIndex];
    if (!video) return;

    if (video.hasAudio !== false && !isSoundUnlocked()) {
      setShowSoundHint(true);
    }

    let timer: ReturnType<typeof window.setTimeout> | undefined;
    if (!viewedIdsRef.current.has(video.id)) {
      timer = window.setTimeout(() => {
        viewedIdsRef.current.add(video.id);
        void markVideoViewed(video.id);
      }, 2000);
    }

    if (currentIndex >= videos.length - 3 && onLoadMore) {
      onLoadMore();
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [currentIndex, currentVideoId, schedulePlay, onLoadMore, videos.length, setPlayBtnVisible]);

  useEffect(() => {
    if (!showSoundHint) return;
    const t = window.setTimeout(() => setShowSoundHint(false), 5000);
    return () => window.clearTimeout(t);
  }, [showSoundHint]);

  const handleScroll = () => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const container = containerRef.current;
      if (!container) return;
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== currentIndex && index >= 0 && index < videos.length) {
        setCurrentIndex(index);
        onIndexChange?.(index);
      }
    });
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
    if (Date.now() < suppressTapUntilRef.current) return;
    if (Date.now() - lastTapRef.current < 300) return;
    const el = videoRefs.current.get(index);
    if (!el) return;

    if (showPlayBtnRef.current || userPausedRef.current) {
      void playAt(index, true);
      return;
    }

    if (!el.paused) {
      if (el.muted || isMutedRef.current) {
        void playAt(index, true);
        return;
      }
      userPausedRef.current = true;
      el.pause();
      setPlayBtnVisible(true);
      return;
    }

    void playAt(index, true);
  };

  const handleResume = (index: number) => {
    suppressParentTap();
    void playAt(index, true);
  };

  const handleToggleMute = (index: number) => {
    if (isMutedRef.current) {
      void playAt(index, true);
    } else {
      isMutedRef.current = true;
      setIsMuted(true);
      const el = videoRefs.current.get(index);
      if (el) applyAudio(el, true);
    }
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
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`);
    } else if (tg?.openLink) {
      tg.openLink(shareUrl);
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
        className={`${immersive ? 'h-full' : 'h-full'} snap-y snap-mandatory overflow-y-scroll`}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {videos.map((video, index) => {
          const inWindow = Math.abs(index - currentIndex) <= 1;
          if (!inWindow) {
            return (
              <div
                key={video.id}
                className="relative h-full min-h-full w-full snap-start snap-always bg-black"
                aria-hidden
              />
            );
          }

          return (
            <div
              key={video.id}
              className="relative h-full min-h-full w-full snap-start snap-always bg-black"
              onClick={() => handleTap(index)}
              onTouchEnd={(e) => handleDoubleTap(e, video)}
            >
              <video
                ref={(el) => onVideoMounted(index, el)}
                src={getPlayableUrl(video)}
                poster={video.thumbnailUrl || undefined}
                className="h-full w-full object-cover"
                loop
                playsInline
                autoPlay={index === currentIndex}
                preload={index === currentIndex ? 'auto' : 'metadata'}
                onPlaying={() => {
                  if (index === currentIndex) setPlayBtnVisible(false);
                }}
                onPause={() => {
                  if (index === currentIndex && userPausedRef.current) {
                    setPlayBtnVisible(true);
                  }
                }}
                onCanPlay={() => {
                  if (index === currentIndex && !userPausedRef.current) {
                    const el = videoRefs.current.get(index);
                    if (el?.paused) schedulePlay(index, false);
                  }
                }}
              />

              {index === currentIndex && !isMuted && video.hasAudio === false && (
                <p className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/80">
                  Ин видео садо надорад
                </p>
              )}

              {index === currentIndex && showSoundHint && !showPlayBtn && (
                <button
                  type="button"
                  className="absolute left-1/2 top-24 z-30 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleResume(index);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  🔊 Барои садо пахш кунед
                </button>
              )}

              {index === currentIndex && showPlayBtn && (
                <button
                  type="button"
                  aria-label="Пахш"
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/25"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleResume(index);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/55 text-4xl text-white shadow-lg">
                    ▶
                  </span>
                </button>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

              <div className="absolute bottom-2 left-3 right-14 z-10">
                <div className="mb-2 flex items-center gap-2">
                  <img
                    src={video.authorAvatar || 'https://i.pravatar.cc/40'}
                    alt=""
                    className="h-8 w-8 rounded-full border border-white/40 object-cover"
                  />
                  <span className="text-sm font-semibold drop-shadow">
                    @{video.authorName.replace(/\s+/g, '').toLowerCase() || 'creator'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-1 rounded-md border border-white/60 px-2 py-0.5 text-xs font-semibold"
                  >
                    Follow
                  </button>
                </div>
                <p className="line-clamp-2 text-sm drop-shadow">{video.caption}</p>
                {video.hashtags?.length > 0 && (
                  <p className="mt-1 line-clamp-1 text-xs text-white/90 drop-shadow">
                    {video.hashtags.map((h) => `#${h}`).join(' ')}
                  </p>
                )}
                {video.musicTitle && video.hasAudio !== false && (
                  <div className="mt-2 flex items-center gap-2 overflow-hidden">
                    <IconMusic className="h-3 w-3 shrink-0 animate-pulse" />
                    <p className="truncate text-xs drop-shadow">{video.musicTitle}</p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-6 right-2 z-10 flex flex-col items-center gap-5">
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
                  onClick={(e) => e.stopPropagation()}
                  className="h-9 w-9 overflow-hidden rounded-lg border-2 border-white/80"
                >
                  <img
                    src={video.thumbnailUrl || video.authorAvatar || 'https://i.pravatar.cc/80'}
                    alt=""
                    className={`h-full w-full object-cover ${index === currentIndex ? 'animate-spin-slow' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  aria-label={isMuted ? 'Садо фаъол кунед' : 'Садо хомӯш кунед'}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    suppressParentTap();
                    handleToggleMute(index);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${
                    isMuted ? 'bg-white/20' : 'bg-ig-accent/80'
                  }`}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {heartAnim && (
        <div
          className="pointer-events-none fixed z-50 animate-heart-pop text-7xl"
          style={{
            left: heartAnim.x - 36,
            top: heartAnim.y - 36,
            filter: 'drop-shadow(0 0 8px rgba(225,48,108,0.8))',
          }}
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
      className={`flex flex-col items-center gap-0.5 ${active ? 'text-ig-accent' : 'text-white'}`}
    >
      <span className="drop-shadow-lg">{icon}</span>
      <span className="text-[11px] font-semibold drop-shadow">{count}</span>
    </button>
  );
}
