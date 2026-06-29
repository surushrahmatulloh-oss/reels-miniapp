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
  immersive?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const LOG = '[ReelsPlayer]';

function logVideoState(el: HTMLVideoElement, label: string, extra?: Record<string, unknown>) {
  console.log(LOG, label, {
    src: el.currentSrc,
    paused: el.paused,
    ended: el.ended,
    readyState: el.readyState,
    networkState: el.networkState,
    currentTime: el.currentTime,
    mediaError: el.error?.code,
    mediaErrorMsg: el.error?.message,
    ...extra,
  });
}

async function tryPlayVideo(
  el: HTMLVideoElement,
  label: string,
): Promise<boolean> {
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');

  try {
    await el.play();
    console.log(LOG, `play OK (${label})`, { src: el.currentSrc, paused: el.paused });
    logVideoState(el, `state after play OK (${label})`);
    return true;
  } catch (err) {
    console.warn(LOG, `play FAIL (${label})`, {
      src: el.currentSrc,
      readyState: el.readyState,
      networkState: el.networkState,
      error: err instanceof Error ? err.message : String(err),
    });
    logVideoState(el, `state after play FAIL (${label})`);
    return false;
  }
}

/** Manual play() fallback with retries after element loads */
async function playWithFallback(
  el: HTMLVideoElement,
  label: string,
): Promise<boolean> {
  if (await tryPlayVideo(el, label)) return true;

  for (const delay of [150, 400, 900]) {
    await new Promise((r) => window.setTimeout(r, delay));
    if (await tryPlayVideo(el, `${label}-retry@${delay}ms`)) return true;
  }

  console.error(LOG, `all play attempts failed (${label})`, el.currentSrc);
  return false;
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
  const playBlockedRef = useRef(false);
  const [heartAnim, setHeartAnim] = useState<{ x: number; y: number } | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showPlayBtn, setShowPlayBtn] = useState(false);

  const storeIndex = useFeedStore((s) => s.currentIndex);
  const setStoreIndex = useFeedStore((s) => s.setCurrentIndex);
  const currentIndex = controlledIndex ?? storeIndex;
  const setCurrentIndex = onIndexChange ?? setStoreIndex;
  const [isMuted, setIsMuted] = useState(true);
  const updateVideo = useFeedStore((s) => s.updateVideo);

  const syncPlayOverlay = useCallback((index: number, reason: string) => {
    const el = videoRefs.current.get(index);
    if (!el || index !== currentIndex) return;

    const isActuallyPlaying = !el.paused && !el.ended && el.readyState >= 2;
    const shouldShow =
      !isActuallyPlaying && (playBlockedRef.current || userPausedRef.current) && !el.ended;

    console.log(LOG, 'syncPlayOverlay', {
      reason,
      index,
      shouldShow,
      isActuallyPlaying,
      userPaused: userPausedRef.current,
      playBlocked: playBlockedRef.current,
      paused: el.paused,
      readyState: el.readyState,
      currentTime: el.currentTime,
    });

    setShowPlayBtn(shouldShow);
  }, [currentIndex]);

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
    (index: number) => {
      userPausedRef.current = false;
      playBlockedRef.current = false;
      for (const [i, video] of videoRefs.current) {
        if (i === index) {
          video.muted = isMuted;
          void playWithFallback(video, `playVideo idx=${index}`).then((ok) => {
            if (!ok && video.paused) {
              playBlockedRef.current = true;
            } else {
              playBlockedRef.current = false;
            }
            syncPlayOverlay(index, `playVideo done ok=${ok}`);
          });
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    },
    [isMuted, syncPlayOverlay],
  );

  useEffect(() => {
    userPausedRef.current = false;
    playBlockedRef.current = false;
    setShowPlayBtn(false);
    playVideo(currentIndex);
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

  /** Fallback: manual play() after video element mounts / src changes */
  useEffect(() => {
    const el = videoRefs.current.get(currentIndex);
    const item = videos[currentIndex];
    if (!el || !item) return;

    console.log(LOG, 'useEffect mount', {
      index: currentIndex,
      id: item.id,
      src: getPlayableUrl(item),
      readyState: el.readyState,
    });

    el.muted = isMuted;
    void playWithFallback(el, `useEffect idx=${currentIndex}`).then((ok) => {
      if (!ok && el.paused) playBlockedRef.current = true;
      else if (!el.paused) playBlockedRef.current = false;
      syncPlayOverlay(currentIndex, `useEffect mount ok=${ok}`);
    });

    const onLoaded = () => {
      logVideoState(el, `loadeddata idx=${currentIndex}`);
      void playWithFallback(el, `loadeddata idx=${currentIndex}`).then((ok) => {
        if (!ok && el.paused) playBlockedRef.current = true;
        else if (!el.paused) playBlockedRef.current = false;
        syncPlayOverlay(currentIndex, `loadeddata ok=${ok}`);
      });
    };
    const onCanPlay = () => {
      void playWithFallback(el, `canplay idx=${currentIndex}`).then((ok) => {
        if (!ok && el.paused) playBlockedRef.current = true;
        else if (!el.paused) playBlockedRef.current = false;
        syncPlayOverlay(currentIndex, `canplay ok=${ok}`);
      });
    };

    el.addEventListener('loadeddata', onLoaded);
    el.addEventListener('canplay', onCanPlay);

    return () => {
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('canplay', onCanPlay);
    };
  }, [currentIndex, videos, isMuted, syncPlayOverlay]);

  useEffect(() => {
    for (const video of videoRefs.current.values()) {
      video.muted = isMuted;
    }
  }, [isMuted, currentIndex]);

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
    if (Date.now() - lastTapRef.current < 300) return;
    const el = videoRefs.current.get(index);
    if (el && !el.paused) {
      userPausedRef.current = true;
      el.pause();
      syncPlayOverlay(index, 'user tap pause');
      return;
    }
    userPausedRef.current = false;
    playBlockedRef.current = false;
    void handlePlayButton(index);
  };

  const handlePlayButton = async (index: number) => {
    const el = videoRefs.current.get(index);
    if (!el) {
      console.warn(LOG, 'handlePlayButton: no video element', index);
      return;
    }

    el.muted = isMuted;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');

    console.log(LOG, 'handlePlayButton: direct play()', { index, src: el.currentSrc });

    try {
      el.muted = isMuted;
      await el.play();
      userPausedRef.current = false;
      playBlockedRef.current = false;
      syncPlayOverlay(index, 'handlePlayButton direct OK');
      console.log(LOG, 'handlePlayButton: direct play OK', { paused: el.paused });
    } catch (err) {
      console.warn(LOG, 'handlePlayButton: direct play failed, fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
      const ok = await playWithFallback(el, `play-btn idx=${index}`);
      playBlockedRef.current = !ok && el.paused;
      syncPlayOverlay(index, `handlePlayButton fallback ok=${ok}`);
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
        className={`${immersive ? 'h-full' : 'h-full'} snap-y snap-mandatory overflow-y-scroll scroll-smooth`}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="relative h-full min-h-full w-full snap-start snap-always bg-black"
            onClick={() => handleTap(index)}
            onTouchEnd={(e) => handleDoubleTap(e, video)}
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(index, el);
                else videoRefs.current.delete(index);
              }}
              src={getPlayableUrl(video)}
              poster={video.thumbnailUrl || undefined}
              className="h-full w-full object-cover"
              loop
              playsInline
              muted={isMuted}
              autoPlay
              preload="auto"
              onLoadedData={() => {
                const el = videoRefs.current.get(index);
                if (el && index === currentIndex) {
                  void playWithFallback(el, `onLoadedData idx=${index}`).then((ok) => {
                    if (!ok && el.paused) playBlockedRef.current = true;
                    else if (!el.paused) playBlockedRef.current = false;
                    syncPlayOverlay(index, `onLoadedData ok=${ok}`);
                  });
                }
              }}
              onCanPlay={() => {
                const el = videoRefs.current.get(index);
                if (el && index === currentIndex) {
                  void playWithFallback(el, `onCanPlay prop idx=${index}`).then((ok) => {
                    if (!ok && el.paused) playBlockedRef.current = true;
                    else if (!el.paused) playBlockedRef.current = false;
                    syncPlayOverlay(index, `onCanPlay ok=${ok}`);
                  });
                }
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (index !== currentIndex) return;
                if (!el.paused && el.currentTime > 0.05) {
                  playBlockedRef.current = false;
                  userPausedRef.current = false;
                  setShowPlayBtn(false);
                }
              }}
              onError={(e) => {
                const el = e.currentTarget;
                console.error(LOG, 'video error', {
                  index,
                  src: el.currentSrc,
                  networkState: el.networkState,
                  mediaError: el.error?.code,
                  message: el.error?.message,
                });
                logVideoState(el, `video error idx=${index}`);
                if (index === currentIndex) {
                  playBlockedRef.current = true;
                  syncPlayOverlay(index, 'onError');
                }
              }}
              onPlaying={() => {
                if (index !== currentIndex) return;
                playBlockedRef.current = false;
                userPausedRef.current = false;
                setShowPlayBtn(false);
                logVideoState(videoRefs.current.get(index)!, `playing idx=${index}`);
              }}
            />

            {index === currentIndex && showPlayBtn && (
              <button
                type="button"
                aria-label="Пахш"
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/25"
                onClick={(e) => {
                  e.stopPropagation();
                  void handlePlayButton(index);
                }}
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/55 text-4xl text-white shadow-lg backdrop-blur-sm">
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
              {video.musicTitle && (
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
                onClick={(e) => {
                  e.stopPropagation();
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  const el = videoRefs.current.get(currentIndex);
                  if (el) {
                    el.muted = nextMuted;
                    void tryPlayVideo(el, 'mute-toggle');
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
          className="pointer-events-none fixed z-50 animate-heart-pop text-7xl"
          style={{ left: heartAnim.x - 36, top: heartAnim.y - 36, filter: 'drop-shadow(0 0 8px rgba(225,48,108,0.8))' }}
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
