import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Video } from '@/types';
import { setAuthToken } from '@/api/client';
import { dedupeVideosById } from '@/utils/video';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        setAuthToken(token);
        set({ token, user, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'reels-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token);
        }
      },
    },
  ),
);

interface FeedState {
  videos: Video[];
  currentIndex: number;
  nextCursor: string | null;
  hasMore: boolean;
  isMuted: boolean;
  playbackOpen: boolean;
  playbackVideos: Video[];
  playbackIndex: number;
  setVideos: (videos: Video[], append?: boolean) => void;
  setCurrentIndex: (index: number) => void;
  setPlaybackIndex: (index: number) => void;
  setPagination: (nextCursor: string | null, hasMore: boolean) => void;
  updateVideo: (id: string, patch: Partial<Video>) => void;
  toggleMute: () => void;
  openPlayback: (videos: Video[], startIndex?: number) => void;
  closePlayback: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  videos: [],
  currentIndex: 0,
  nextCursor: null,
  hasMore: true,
  isMuted: true,
  playbackOpen: false,
  playbackVideos: [],
  playbackIndex: 0,
  setVideos: (videos, append = false) =>
    set((state) => {
      const merged = append ? [...state.videos, ...videos] : videos;
      return { videos: dedupeVideosById(merged) };
    }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setPlaybackIndex: (index) => set({ playbackIndex: index }),
  setPagination: (nextCursor, hasMore) => set({ nextCursor, hasMore }),
  updateVideo: (id, patch) =>
    set((state) => ({
      videos: state.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      playbackVideos: state.playbackVideos.map((v) =>
        v.id === id ? { ...v, ...patch } : v,
      ),
    })),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  openPlayback: (playbackVideos, startIndex = 0) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    window.Telegram?.WebApp?.expand?.();
    set({
      playbackOpen: true,
      playbackVideos: dedupeVideosById(playbackVideos),
      playbackIndex: startIndex,
    });
  },
  closePlayback: () =>
    set({
      playbackOpen: false,
      playbackVideos: [],
      playbackIndex: 0,
    }),
}));

interface OnboardingState {
  step: number;
  username: string;
  bio: string;
  avatarUrl: string;
  formats: string[];
  categories: string[];
  setStep: (step: number) => void;
  setField: <K extends keyof Omit<OnboardingState, 'setStep' | 'setField' | 'toggleCategory' | 'toggleFormat'>>(
    key: K,
    value: OnboardingState[K],
  ) => void;
  toggleCategory: (id: string) => void;
  toggleFormat: (id: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step: 0,
  username: '',
  bio: '',
  avatarUrl: '',
  formats: ['reels'],
  categories: [],
  setStep: (step) => set({ step }),
  setField: (key, value) => set({ [key]: value }),
  toggleCategory: (id) => {
    const current = get().categories;
    if (current.includes(id)) {
      set({ categories: current.filter((c) => c !== id) });
    } else {
      set({ categories: [...current, id] });
    }
  },
  toggleFormat: (id) => {
    const current = get().formats;
    if (current.includes(id)) {
      if (current.length > 1) {
        set({ formats: current.filter((f) => f !== id) });
      }
    } else {
      set({ formats: [...current, id] });
    }
  },
  reset: () =>
    set({
      step: 0,
      username: '',
      bio: '',
      avatarUrl: '',
      formats: ['reels'],
      categories: [],
    }),
}));
