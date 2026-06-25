import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  getSavedVideos,
  getLikedVideos,
  updateProfile,
  updatePreferences,
} from '@/api/client';
import { useAuthStore } from '@/store';
import { useFeedStore } from '@/store';
import { CATEGORIES, FORMATS } from '@/types';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { VideoGridTile } from '@/components/VideoGridTile';
import { toVideo } from '@/utils/video';
import type { Video } from '@/types';

type Tab = 'saved' | 'liked' | 'settings';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [tab, setTab] = useState<Tab>('saved');
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [saveError, setSaveError] = useState('');
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const openPlayback = useFeedStore((s) => s.openPlayback);

  const { isLoading, error: meError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const me = await getMe();
      setUser(me);
      setBio(me.bio);
      setDisplayName(me.displayName);
      setUsername(me.username);
      return me;
    },
    retry: false,
  });

  useEffect(() => {
    if (meError) {
      logout();
      window.location.reload();
    }
  }, [meError, logout]);

  const { data: savedVideos = [] } = useQuery({
    queryKey: ['saved'],
    queryFn: getSavedVideos,
    enabled: tab === 'saved',
  });

  const { data: likedVideos = [] } = useQuery({
    queryKey: ['liked'],
    queryFn: getLikedVideos,
    enabled: tab === 'liked',
  });

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({ bio, displayName, username }),
    onSuccess: (updated) => {
      setUser(updated);
      setEditing(false);
      setSaveError('');
    },
    onError: () => {
      setSaveError('Нигоҳ доштан нашуд. Боз кушед ё аз нав ворид шавед.');
    },
  });

  if (isLoading || !user) {
    return <LoadingScreen />;
  }

  const gridVideos: Video[] = (tab === 'saved' ? savedVideos : likedVideos).map((v) =>
    toVideo(v),
  );

  const openVideo = (index: number) => {
    if (gridVideos.length > 0) openPlayback(gridVideos, index);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-20">
      <div className="px-4 pt-6">
        <div className="flex items-start gap-4">
          <img
            src={user.avatarUrl || 'https://i.pravatar.cc/120'}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
          <div className="flex-1">
            <h1 className="text-lg font-bold">{user.displayName || user.username}</h1>
            <p className="text-sm text-white/60">@{user.username}</p>
            {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
            <div className="mt-3 flex gap-4 text-sm">
              <span>
                <strong>{user.followersCount}</strong> подписчик
              </span>
              <span>
                <strong>{user.followingCount}</strong> подписка
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="mt-4 w-full rounded-xl border border-white/20 py-2 text-sm font-medium"
        >
          {editing ? 'Бекор кардан' : 'Таҳрир кардан'}
        </button>

        {editing && (
          <div className="mt-4 space-y-3 rounded-xl bg-white/5 p-4">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="Username"
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none"
            />
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ном"
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Биография"
              maxLength={150}
              rows={2}
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full rounded-lg bg-tg-button py-2 text-sm font-medium text-tg-button-text"
            >
              {saveMutation.isPending ? 'Нигоҳ мешавад...' : 'Нигоҳ доштан'}
            </button>
            {saveError && <p className="text-center text-xs text-red-400">{saveError}</p>}
          </div>
        )}

        <div className="mt-4 flex border-b border-white/10">
          {(['saved', 'liked', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium ${
                tab === t ? 'border-b-2 border-white text-white' : 'text-white/50'
              }`}
            >
              {t === 'saved' ? 'Сохраненные' : t === 'liked' ? 'Лайки' : 'Тanzimот'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'settings' ? (
        <SettingsPanel user={user} onUpdate={setUser} queryClient={queryClient} />
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {gridVideos.length === 0 && (
            <p className="col-span-3 py-12 text-center text-sm text-white/50">Холӣ</p>
          )}
          {gridVideos.map((video, index) => (
            <VideoGridTile
              key={video.id}
              video={video}
              onClick={() => openVideo(index)}
            />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function SettingsPanel({
  user,
  onUpdate,
  queryClient,
}: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
  onUpdate: (u: typeof user) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [categories, setCategories] = useState(user.preferences.categories);
  const [formats, setFormats] = useState(user.preferences.formats);
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [settingsError, setSettingsError] = useState('');

  const save = async () => {
    if (categories.length < 3) {
      setSettingsError('Ақаллан 3 категория интихоб кунед');
      return;
    }
    try {
      setSettingsError('');
      const [updatedProfile, updatedPrefs] = await Promise.all([
        updateProfile({ isPrivate }),
        updatePreferences({ formats, categories, language: user.preferences.language }),
      ]);
      onUpdate({ ...updatedProfile, ...updatedPrefs, preferences: updatedPrefs.preferences });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch {
      setSettingsError('Хato! Боз кушед ё аз нав ворид шавед.');
    }
  };

  const toggleCat = (id: string) => {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleFmt = (id: string) => {
    setFormats((prev) => {
      if (prev.includes(id as typeof prev[number])) {
        return prev.length > 1 ? prev.filter((f) => f !== id) : prev;
      }
      return [...prev, id as typeof prev[number]];
    });
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <label className="flex items-center justify-between">
        <span className="text-sm">Профили хусусӣ</span>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-5 w-5"
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Категорияҳо</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCat(c.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                categories.includes(c.id) ? 'bg-tg-button' : 'bg-white/10'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Форматҳо</p>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFmt(f.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                formats.includes(f.id) ? 'bg-tg-button' : 'bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => void save()}
        className="w-full rounded-xl bg-tg-button py-3 text-sm font-medium text-tg-button-text"
      >
        Нигоҳ доштан
      </button>
      {settingsError && <p className="text-center text-xs text-red-400">{settingsError}</p>}
    </div>
  );
}
