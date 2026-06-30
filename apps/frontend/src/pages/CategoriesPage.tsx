import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORIES } from '@/types';
import { useAuthStore, useFeedStore } from '@/store';
import { updatePreferences } from '@/api/client';
import { BottomNav } from '@/components/BottomNav';

export function CategoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setActiveCategories = useFeedStore((s) => s.setActiveCategories);
  const setVideos = useFeedStore((s) => s.setVideos);
  const setCurrentIndex = useFeedStore((s) => s.setCurrentIndex);

  const saved = user?.preferences.categories ?? [];
  const [selected, setSelected] = useState<string[]>(() => {
    if (saved.length > 0) return saved;
    try {
      const raw = localStorage.getItem('reels:selectedCategories');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const continueToReels = async () => {
    if (selected.length < 1) {
      setError('Ҳадди ақал 1 категория интихоб кунед');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await updatePreferences({
        formats: user?.preferences.formats ?? ['reels'],
        categories: selected,
        language: user?.preferences.language,
      });
      setUser(updated);
      localStorage.setItem('reels:selectedCategories', JSON.stringify(selected));

      setActiveCategories(selected);
      setVideos([]);
      setCurrentIndex(0);
      useFeedStore.getState().setPagination(null, true);
      void queryClient.removeQueries({ queryKey: ['feed'] });

      navigate('/reels', { replace: true });
    } catch {
      setError('Хатогӣ. Боз кӯшиш кунед.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-black pb-14">
      <header className="border-b border-ig-border px-4 py-4">
        <h1 className="text-xl font-bold">Категорияҳои дӯстдошта</h1>
        <p className="mt-1 text-sm text-ig-muted">
          Як ё якчанд категория интихоб кунед
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const isOn = selected.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  isOn
                    ? 'border-ig-accent bg-ig-accent/15'
                    : 'border-ig-border bg-ig-surface'
                }`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <p className="mt-2 text-sm font-semibold">{cat.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="px-4 pb-2 text-center text-sm text-ig-accent">{error}</p>}

      <div className="border-t border-ig-border px-4 py-3">
        <p className="mb-2 text-center text-xs text-ig-muted">
          Интихобшуда: {selected.length}
        </p>
        <button
          type="button"
          disabled={saving || selected.length < 1}
          onClick={() => void continueToReels()}
          className="w-full rounded-xl bg-ig-accent py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Сабр кунед...' : '➡ Давом додан'}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
