import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';
import { useFeedStore } from '@/store';

const WS_URL = import.meta.env.VITE_WS_URL ?? window.location.origin;

export function useTimedOut(active: boolean, ms: number): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);

  return active && timedOut;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const updateVideo = useFeedStore((s) => s.updateVideo);

  useEffect(() => {
    if (!token || !user) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.emit('join_feed', {
      userId: user.id,
      categories: user.preferences.categories,
    });

    socket.on('like_update', ({ videoId, likeCount }: { videoId: string; likeCount: number }) => {
      updateVideo(videoId, { likes: likeCount });
    });

    socket.on('new_comment', ({ videoId }: { videoId: string }) => {
      const videos = useFeedStore.getState().videos;
      const video = videos.find((v) => v.id === videoId);
      if (video) {
        updateVideo(videoId, { commentsCount: video.commentsCount + 1 });
      }
    });

    socket.on('new_video', (video: { id: string }) => {
      console.log('New video available:', video.id);
    });

    return () => {
      socket.emit('leave_feed', { userId: user.id });
      socket.disconnect();
    };
  }, [token, user, updateVideo]);

  return socketRef;
}

export function useTelegram() {
  const webApp = window.Telegram?.WebApp;

  useEffect(() => {
    webApp?.ready();
    webApp?.expand();
    webApp?.enableClosingConfirmation();
  }, [webApp]);

  const initData = webApp?.initData ?? '';
  const user = webApp?.initDataUnsafe?.user;

  return {
    webApp,
    initData,
    tgUser: user,
    isTelegram: Boolean(webApp?.initData),
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        enableClosingConfirmation: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        openTelegramLink: (url: string) => void;
        openLink: (url: string) => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
        };
        themeParams: Record<string, string>;
        colorScheme: 'light' | 'dark';
      };
    };
  }
}
