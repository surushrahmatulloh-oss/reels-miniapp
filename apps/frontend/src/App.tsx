import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { authTelegram } from '@/api/client';
import { useTelegram } from '@/hooks';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { FeedPage } from '@/pages/FeedPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';
import { CreatePage } from '@/pages/CreatePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ReelsOverlay } from '@/components/ReelsOverlay';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  const { initData, isTelegram } = useTelegram();
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function boot() {
      try {
        if (isAuthenticated && user) {
          setBooting(false);
          return;
        }

        const data = initData || 'user=%7B%22id%22%3A123456789%2C%22username%22%3A%22devuser%22%2C%22first_name%22%3A%22Dev%22%7D&auth_date=1700000000&hash=dev';
        const result = await authTelegram(data);
        setAuth(result.token, result.user);
      } catch {
        setError('Хатогӣ дар воридшавӣ. Backend-ро санҷед.');
      } finally {
        setBooting(false);
      }
    }

    void boot();
  }, [initData, isAuthenticated, user, setAuth, isTelegram]);

  if (booting) {
    return <LoadingScreen message="Воридшавӣ..." />;
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-white/50">
          {isTelegram
            ? 'Backend-ро санҷед: start.bat-ро иҷро кунед.'
            : 'Барои санҷиш дар браузер backend бояд кор кунад. Дар Telegram: @miniapprealsBot'}
        </p>
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
      <Route path="/search" element={<SearchPage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="h-full">
          <AppRoutes />
          <ReelsOverlay />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
