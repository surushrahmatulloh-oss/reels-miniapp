import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, FORMATS } from '@/types';
import { useOnboardingStore, useAuthStore } from '@/store';
import { completeOnboarding } from '@/api/client';
import { useTelegram } from '@/hooks';

const STEPS = ['Воридшавӣ', 'Профил', 'Категорияҳо'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { tgUser, isTelegram } = useTelegram();
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
      navigate('/reels', { replace: true });
    } catch {
      setError('Хатогӣ рух дод. Боз кӯшиш кунед.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-black px-6 py-8 text-white">
      {step > 0 && (
        <div className="mb-6 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i <= step ? 'bg-ig-accent' : 'bg-ig-border'}`}
            />
          ))}
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="ig-gradient-text text-6xl font-bold italic tracking-tight">Instagram</h1>
          <p className="mt-3 max-w-xs text-sm text-ig-muted">
            Reels Mini App — видёҳои кӯтоҳ бо дизайни воқии Instagram
          </p>
          {tgUser && (
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-ig-border bg-ig-surface px-4 py-3">
              <img
                src={displayAvatar || 'https://i.pravatar.cc/80'}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="text-left">
                <p className="text-sm font-semibold">{tgUser.first_name}</p>
                <p className="text-xs text-ig-muted">@{tgUser.username ?? 'telegram'}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={next}
            className="mt-10 w-full max-w-xs rounded-xl bg-ig-accent py-3.5 text-sm font-semibold text-white"
          >
            {isTelegram ? 'Идома бо Telegram' : 'Оғоз кардан'}
          </button>
        </div>
      )}

      {step === 1 && (
        <>
          <h1 className="mb-1 text-2xl font-bold">Профил созед</h1>
          <p className="mb-6 text-sm text-ig-muted">Аватар, ном ва bio</p>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex justify-center">
              <div className="ig-gradient-ring rounded-full p-[3px]">
                <img
                  src={displayAvatar || 'https://i.pravatar.cc/120?u=default'}
                  alt="avatar"
                  className="h-24 w-24 rounded-full border-2 border-black object-cover"
                />
              </div>
            </div>
            <input
              value={username || tgUser?.username || ''}
              onChange={(e) => setField('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="username"
              className="rounded-xl border border-ig-border bg-ig-surface px-4 py-3 text-sm outline-none focus:border-ig-accent"
            />
            <textarea
              value={bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder="Био"
              maxLength={150}
              rows={3}
              className="rounded-xl border border-ig-border bg-ig-surface px-4 py-3 text-sm outline-none focus:border-ig-accent"
            />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="mb-1 text-2xl font-bold">Категорияҳо</h1>
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
                    ? 'border-ig-accent bg-ig-accent/10'
                    : 'border-ig-border bg-ig-surface'
                }`}
              >
                <span className="mr-2">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="hidden">
            {FORMATS.map((fmt) => (
              <button key={fmt.id} type="button" onClick={() => toggleFormat(fmt.id)}>
                {fmt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p className="mb-2 text-sm text-ig-accent">{error}</p>}

      {step > 0 && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={back}
            className="flex-1 rounded-xl border border-ig-border py-3 text-sm font-medium"
          >
            Бозгашт
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 rounded-xl bg-ig-accent py-3 text-sm font-semibold text-white"
            >
              Идома
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={loading || categories.length < 5}
              className="flex-1 rounded-xl bg-ig-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Сабр кунед...' : 'Оғоз кардан'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
