import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, FORMATS } from '@/types';
import { useOnboardingStore, useAuthStore } from '@/store';
import { completeOnboarding } from '@/api/client';
import { useTelegram } from '@/hooks';

const STEPS = ['Reels', 'Профил', 'Категорияҳо'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { tgUser } = useTelegram();
  const setUser = useAuthStore((s) => s.setUser);
  const {
    step,
    username,
    bio,
    avatarUrl,
    formats,
    categories,
    setStep,
    setField,
    toggleCategory,
    toggleFormat,
  } = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const displayAvatar = avatarUrl || tgUser?.photo_url || '';

  const next = () => setStep(Math.min(step + 1, STEPS.length - 1));
  const back = () => setStep(Math.max(step - 1, 0));

  const finish = async () => {
    if (categories.length < 5) {
      setError('Ҳадди ақал 5 категория интихоб кунед');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await completeOnboarding({
        username: username || tgUser?.username,
        bio,
        avatarUrl: displayAvatar,
        formats: formats.length ? (formats as ('reels' | 'igtv' | 'stories')[]) : ['reels'],
        categories,
      });
      setUser(user);
      navigate('/feed', { replace: true });
    } catch {
      setError('Хатогӣ рух дод. Боз кӯшиш кунед.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-black px-6 py-8">
      {step > 0 && (
        <div className="mb-6 flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/20'}`}
            />
          ))}
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-8">
            <h1 className="bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-5xl font-bold italic tracking-tight text-transparent">
              Reels
            </h1>
          </div>
          <p className="mb-10 max-w-xs text-sm text-ig-muted">
            Видёҳои кӯтоҳ, монанди Instagram Reels — бо Telegram ворид шавед
          </p>
          <button
            type="button"
            onClick={next}
            className="w-full max-w-xs rounded-lg bg-ig-link py-3 text-sm font-semibold text-white"
          >
            Идома бо Telegram
          </button>
        </div>
      )}

      {step === 1 && (
        <>
          <h1 className="mb-2 text-2xl font-bold">Профил</h1>
          <p className="mb-6 text-sm text-ig-muted">Акс, ном ва bio</p>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex justify-center">
              <img
                src={displayAvatar || 'https://i.pravatar.cc/120?u=default'}
                alt="avatar"
                className="h-24 w-24 rounded-full border border-ig-border object-cover"
              />
            </div>
            <input
              value={username || tgUser?.username || ''}
              onChange={(e) => setField('username', e.target.value)}
              placeholder="Username"
              className="rounded-lg border border-ig-border bg-ig-surface px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder="Био"
              maxLength={150}
              rows={3}
              className="rounded-lg border border-ig-border bg-ig-surface px-4 py-3 text-sm outline-none"
            />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="mb-2 text-2xl font-bold">Категорияҳо</h1>
          <p className="mb-4 text-sm text-ig-muted">
            Ҳадди ақал 5 категория ({categories.length}/5+)
          </p>
          <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto content-start">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  categories.includes(cat.id)
                    ? 'border-white bg-white/10'
                    : 'border-ig-border bg-ig-surface'
                }`}
              >
                <span className="mr-2">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="mt-4 hidden">
            {FORMATS.map((fmt) => (
              <button key={fmt.id} type="button" onClick={() => toggleFormat(fmt.id)}>
                {fmt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {step > 0 && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={back}
            className="flex-1 rounded-lg border border-ig-border py-3 text-sm font-medium"
          >
            Бозгашт
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 rounded-lg bg-ig-link py-3 text-sm font-semibold text-white"
            >
              Идома
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={loading || categories.length < 5}
              className="flex-1 rounded-lg bg-ig-link py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Сабр кунед...' : 'Оғоз кардан'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
