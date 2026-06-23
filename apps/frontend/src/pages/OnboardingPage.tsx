import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, FORMATS } from '@/types';
import { useOnboardingStore, useAuthStore } from '@/store';
import { completeOnboarding } from '@/api/client';
import { useTelegram } from '@/hooks';

const STEPS = ['Хуш омадед', 'Профил', 'Категорияҳо', 'Форматҳо'];

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
    if (categories.length < 3) {
      setError('Ҳадди ақал 3 категория интихоб кунед');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await completeOnboarding({
        username: username || tgUser?.username,
        bio,
        avatarUrl: displayAvatar,
        formats: formats as ('reels' | 'igtv' | 'stories')[],
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
    <div className="flex h-full flex-col bg-tg-bg px-6 py-8">
      <div className="mb-6 flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-tg-button' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      <h1 className="mb-2 text-2xl font-bold">{STEPS[step]}</h1>
      <p className="mb-8 text-sm text-white/60">Қadam {step + 1} аз {STEPS.length}</p>

      {step === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-4xl">
            🎬
          </div>
          <h2 className="mb-2 text-xl font-semibold">Reels Mini App</h2>
          <p className="max-w-xs text-sm text-white/60">
            Лентаи персонализатсияшудаи видё — монанди Instagram Reels
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={displayAvatar || 'https://i.pravatar.cc/120?u=default'}
                alt="avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
            </div>
          </div>
          <input
            value={username || tgUser?.username || ''}
            onChange={(e) => setField('username', e.target.value)}
            placeholder="Username"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/40"
          />
          <textarea
            value={bio}
            onChange={(e) => setField('bio', e.target.value)}
            placeholder="Биография (ихтиёрӣ)"
            maxLength={150}
            rows={3}
            className="rounded-xl bg-white/10 px-4 py-3 outline-none placeholder:text-white/40"
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 overflow-y-auto">
          <p className="mb-4 text-sm text-white/60">Ҳадди ақал 3 категория ({categories.length}/3+)</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  categories.includes(cat.id)
                    ? 'border-tg-button bg-tg-button/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <span className="mr-2">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col gap-3">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => toggleFormat(fmt.id)}
              className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                formats.includes(fmt.id)
                  ? 'border-tg-button bg-tg-button/20'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="font-semibold">{fmt.label}</p>
              <p className="text-sm text-white/60">{fmt.desc}</p>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex gap-3">
        {step > 0 && (
          <button
            onClick={back}
            className="flex-1 rounded-xl border border-white/20 py-3 font-medium"
          >
            Бозгашт
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            className="flex-1 rounded-xl bg-tg-button py-3 font-medium text-tg-button-text"
          >
            Идома
          </button>
        ) : (
          <button
            onClick={() => void finish()}
            disabled={loading || categories.length < 3}
            className="flex-1 rounded-xl bg-tg-button py-3 font-medium text-tg-button-text disabled:opacity-50"
          >
            {loading ? 'Сабр кунед...' : 'Оғоз кардан'}
          </button>
        )}
      </div>
    </div>
  );
}
