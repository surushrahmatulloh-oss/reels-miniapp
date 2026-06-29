import { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { authTelegram, pingBackend, setAuthToken } from '@/api/client';
import { useTelegram } from '@/hooks';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { FeedPage } from '@/pages/FeedPage';
import { ReelsPage } from '@/pages/ReelsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';
import { CreatePage } from '@/pages/CreatePage';
import { ReelsOverlay } from '@/components/ReelsOverlay';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const DEV_INIT_DATA =
  'user=%7B%22id%22%3A123456789%2C%22username%22%3A%22devuser%22%2C%22first_name%22%3A%22Dev%22%7D&auth_date=1700000000&hash=dev';

function waitForTelegramInitData(maxMs = 4000): Promise<string> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const data = window.Telegram?.WebApp?.initData ?? '';
      if (data) {
        resolve(data);
        return;
      }
      if (Date.now() - started >= maxMs) {
        resolve('');
        return;
      }
      setTimeout(tick, 120);
    };
    window.Telegram?.WebApp?.ready();
    tick();
  });
}

function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  return hydrated;
}

function AppRoutes() {
  const { isTelegram } = useTelegram();
  const hydrated = useStoreHydrated();
  const { user, isAuthenticated, token, setAuth, logout } = useAuthStore();
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Омодагӣ...');
  const bootedRef = useRef(false);
  const [bootKey, setBootKey] = useState(0);

  const runBoot = useCallback(async () => {
    setBooting(true);
    setError('');
    setStatus('Сервер санҷида мешавад...');

    const serverOk = await pingBackend();
    if (!serverOk) {
      setError('Сервер бе ҷавоб аст (Render cold start). 30 сония интизор шавед ва «Боз кӯшиш» пахш кунед.');
      setBooting(false);
      return;
    }

    if (isAuthenticated && user && token) {
      setAuthToken(token);
      setBooting(false);
      return;
    }

    setStatus('Telegram auth...');

    const inTelegram = Boolean(window.Telegram?.WebApp);
    const tgInit = inTelegram ? await waitForTelegramInitData() : '';

    let initData = tgInit;
    if (!initData && !inTelegram) {
      initData = DEV_INIT_DATA;
    }

    if (!initData) {
      setError('Telegram initData наёфт нашуд. Mini App-ро аз нав кушоед ё /start дар бот пахш кунед.');
      setBooting(false);
      return;
    }

    try {
      const result = await authTelegram(initData);
      setAuth(result.token, result.user);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { error?: string } } };
      if (ax.response?.status === 401) {
        setError(
          'Воридшавӣ номуваффақ. TELEGRAM_BOT_TOKEN дар Render бо ин бот мувофиқ нест. Дар BotFather Mini App URL-ро санҷед.',
        );
      } else {
        setError(ax.response?.data?.error ?? 'Хатогӣ дар воридшавӣ. Боз кӯшиш кунед.');
      }
      logout();
    } finally {
      setBooting(false);
    }
  }, [isAuthenticated, user, token, setAuth, logout]);

  useEffect(() => {
    if (!hydrated || bootedRef.current) return;
    bootedRef.current = true;
    void runBoot();
  }, [hydrated, runBoot, bootKey]);

  const retry = () => {
    bootedRef.current = false;
    setBootKey((k) => k + 1);
  };

  if (!hydrated || booting) {
    return <LoadingScreen message={status} onRetry={error ? retry : undefined} />;
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-ig-accent">{error}</p>
        <p className="text-sm text-ig-muted">
          {isTelegram
            ? 'Render пас аз хоб бедор мешавад (~30 сония). Боз кӯшиш кунед.'
            : 'Дар браузер demo кор мекунад. Барои Telegram:'}
        </p>
        <button
          type="button"
          onClick={retry}
          className="rounded-xl bg-ig-accent px-8 py-3 text-sm font-semibold text-white"
        >
          Боз кӯшиш
        </button>
        {!isTelegram && (
          <a
            href="https://t.me/miniapprealsBot"
            className="text-sm text-ig-link underline"
          >
            @miniapprealsBot
          </a>
        )}
      </div>
    );
  }

  if (!user?.onboardingCompleted) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/reels" element={<ReelsPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/notifications" element={<Navigate to="/reels" replace />} />
      <Route path="*" element={<Navigate to="/reels" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="h-full bg-black text-white">
          <AppRoutes />
          <ReelsOverlay />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
