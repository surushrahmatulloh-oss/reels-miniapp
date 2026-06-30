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
import { useSoundUnlock, isSoundUnlocked } from '@/hooks';
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

function applyAudio(el: HTMLVideoElement, muted: boolean) {
  el.muted = muted;
  el.volume = muted ? 0 : 1;
  el.defaultMuted = muted;
}

async function tryPlayVideo(el: HTMLVideoElement, label: string): Promise<boolean> {
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');

  try {
    await el.play();
    console.log(LOG, `play OK (${label})`, { muted: el.muted, volume: el.volume });
    return true;
  } catch (err) {
    console.warn(LOG, `play FAIL (${label})`, {
      muted: el.muted,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Play video; only falls back to muted when autoplay without user gesture. */
async function playVideoElement(
  el: HTMLVideoElement,
  label: string,
  opts: { withSound: boolean; allowMutedFallback: boolean },
): Promise<boolean> {
  if (opts.withSound) {
    applyAudio(el, false);
    if (await tryPlayVideo(el, `${label}-sound`)) return true;
    if (!opts.allowMutedFallback) return false;
  }

  applyAudio(el, true);
  if (await tryPlayVideo(el, label)) return true;

  for (const delay of [50, 150, 300]) {
    await new Promise((r) => window.setTimeout(r, delay));
    if (await tryPlayVideo(el, `${label}-retry@${delay}ms`)) return true;
  }

  return false;
}

function readMutedPref(): boolean {
  if (isSoundUnlocked()) return false;
  return window.localStorage.getItem('reels:muted') === '1';
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
  const playGenRef = useRef(0);
  const isMutedRef = useRef(readMutedPref());
  const [heartAnim, setHeartAnim] = useState<{ x: number; y: number } | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showPlayBtn, setShowPlayBtn] = useState(false);
  const [showSoundHint, setShowSoundHint] = useState(false);

  const { unlock: unlockSound } = useSoundUnlock();
  const storeIndex = useFeedStore((s) => s.currentIndex);
  const setStoreIndex = useFeedStore((s) => s.setCurrentIndex);
  const currentIndex = controlledIndex ?? storeIndex;
  const setCurrentIndex = onIndexChange ?? setStoreIndex;

  const [isMuted, setIsMuted] = useState(readMutedPref);

  const updateVideo = useFeedStore((s) => s.updateVideo);
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const recoverAttemptsRef = useRef<Map<number, number>>(new Map());
  const scrollRafRef = useRef(0);
  const currentVideoId = videos[currentIndex]?.id;

  useEffect(() => {
    isMutedRef.current = isMuted;
    window.localStorage.setItem('reels:muted', isMuted ? '1' : '0');
  }, [isMuted]);

  const syncMuteOnElement = useCallback((index: number) => {
    const el = videoRefs.current.get(index);
    if (el) applyAudio(el, isMutedRef.current);
  }, []);

  const unmuteCurrent = useCallback(
    (index: number, reason: string) => {
      playGenRef.current += 1;
      unlockSound();
      isMutedRef.current = false;
      setIsMuted(false);
      setShowSoundHint(false);

      const el = videoRefs.current.get(index);
      if (!el) return;

      applyAudio(el, false);
      void tryPlayVideo(el, `unmute:${reason}`);
      console.log(LOG, 'unmuted', { index, reason });
    },
    [unlockSound],
  );

  const muteCurrent = useCallback((index: number) => {
    isMutedRef.current = true;
    setIsMuted(true);
    const el = videoRefs.current.get(index);
    if (el) applyAudio(el, true);
  }, []);

  const syncPlayOverlay = useCallback((index: number) => {
    const el = videoRefs.current.get(index);
    if (!el || index !== currentIndex) return;

    const isActuallyPlaying = !el.paused && !el.ended && el.readyState >= 2;
    const shouldShow =
      !isActuallyPlaying && (playBlockedRef.current || userPausedRef.current) && !el.ended;
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

  const startPlayback = useCallback(
    (index: number, opts?: { withSound?: boolean; allowMutedFallback?: boolean }) => {
      const gen = ++playGenRef.current;
      const withSound = opts?.withSound ?? (!isMutedRef.current || isSoundUnlocked());
      const allowMutedFallback = opts?.allowMutedFallback ?? !withSound;

      userPausedRef.current = false;
      playBlockedRef.current = false;

      for (const [i, video] of videoRefs.current) {
        if (i !== index) {
          video.pause();
          video.currentTime = 0;
        }
      }

      const el = videoRefs.current.get(index);
      if (!el) return;

      void playVideoElement(el, `play idx=${index}`, { withSound, allowMutedFallback }).then((ok) => {
        if (gen !== playGenRef.current) return;

        if (ok) {
          if (el.muted && !isMutedRef.current) {
            applyAudio(el, false);
          }
          if (el.muted) {
            setShowSoundHint(true);
          } else {
            setShowSoundHint(false);
          }
          playBlockedRef.current = false;
        } else if (el.paused) {
          playBlockedRef.current = true;
        }
        syncPlayOverlay(index);
      });
    },
    [syncPlayOverlay],
  );

  useEffect(() => {
    userPausedRef.current = false;
    playBlockedRef.current = false;
    setShowPlayBtn(false);

    const video = videos[currentIndex];
    const wantSound =
      video?.hasAudio !== false &&
      isSoundUnlocked() &&
      !readMutedPref();

    startPlayback(currentIndex, {
      withSound: wantSound,
      allowMutedFallback: true,
    });

    if (!video) return;

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
  }, [currentIndex, currentVideoId, videos.length, startPlayback, onLoadMore]);

  useEffect(() => {
    if (!showSoundHint) return;
    const t = window.setTimeout(() => setShowSoundHint(false), 5000);
    return () => window.clearTimeout(t);
  }, [showSoundHint]);

  useEffect(() => {
    syncMuteOnElement(currentIndex);
  }, [isMuted, currentIndex, syncMuteOnElement]);

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
    if (Date.now() - lastTapRef.current < 300) return;
    const el = videoRefs.current.get(index);
    if (!el) return;

    if (!el.paused) {
      if (el.muted || isMutedRef.current) {
        unmuteCurrent(index, 'tap');
        return;
      }
      userPausedRef.current = true;
      el.pause();
      syncPlayOverlay(index);
      return;
    }

    userPausedRef.current = false;
    playBlockedRef.current = false;
    unmuteCurrent(index, 'tap-play');
    void playVideoElement(el, 'tap-resume', { withSound: true, allowMutedFallback: false });
  };

  const handlePlayButton = async (index: number) => {
    const el = videoRefs.current.get(index);
    if (!el) return;

    unmuteCurrent(index, 'play-btn');
    userPausedRef.current = false;
    playBlockedRef.current = false;

    const ok = await playVideoElement(el, `play-btn idx=${index}`, {
      withSound: true,
      allowMutedFallback: false,
    });
    playBlockedRef.current = !ok && el.paused;
    syncPlayOverlay(index);
  };

  const handleToggleMute = (index: number) => {
    if (isMutedRef.current) {
      unmuteCurrent(index, 'mute-btn');
    } else {
      muteCurrent(index);
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
      const shareTg = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`;
      if (tg.openTelegramLink) {
        tg.openTelegramLink(shareTg);
      } else {
        tg.openLink?.(shareUrl);
      }
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
              ref={(el) => {
                if (el) {
                  videoRefs.current.set(index, el);
                  applyAudio(el, index === currentIndex ? isMutedRef.current : true);
                } else {
                  videoRefs.current.delete(index);
                }
              }}
              src={getPlayableUrl(video)}
              poster={video.thumbnailUrl || undefined}
              className="h-full w-full object-cover"
              loop
              playsInline
              preload={
                index === currentIndex
                  ? 'auto'
                  : Math.abs(index - currentIndex) === 1
                    ? 'metadata'
                    : 'none'
              }
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
                if (index !== currentIndex) return;
                const attempt = recoverAttemptsRef.current.get(index) ?? 0;
                if (attempt < 2) {
                  recoverAttemptsRef.current.set(index, attempt + 1);
                  window.setTimeout(() => {
                    el.load();
                    void playVideoElement(el, `recover idx=${index}`, {
                      withSound: !isMutedRef.current,
                      allowMutedFallback: true,
                    }).then((ok) => {
                      playBlockedRef.current = !ok && el.paused;
                      syncPlayOverlay(index);
                    });
                  }, 250);
                  return;
                }
                playBlockedRef.current = true;
                syncPlayOverlay(index);
              }}
              onPlaying={() => {
                if (index !== currentIndex) return;
                playBlockedRef.current = false;
                userPausedRef.current = false;
                setShowPlayBtn(false);
              }}
            />

            {index === currentIndex && !isMuted && video.hasAudio === false && (
              <p className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/80">
                Ин видео садо надорад
              </p>
            )}

            {index === currentIndex && showSoundHint && !showPlayBtn && (
              <button
                type="button"
                className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  unmuteCurrent(index, 'hint');
                }}
              >
                🔊 Барои садо пахш кунед
              </button>
            )}

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
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMute(index);
                }}
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
