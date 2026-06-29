interface LoadingScreenProps {
  message?: string;
  onRetry?: () => void;
}

export function LoadingScreen({
  message = 'Бор шуда истодааст...',
  onRetry,
}: LoadingScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-black px-6">
      <div className="text-center">
        <h1 className="ig-gradient-text text-5xl font-bold italic tracking-tight">Instagram</h1>
        <p className="mt-2 text-xs tracking-[0.3em] text-ig-muted uppercase">Reels Mini App</p>
      </div>
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-ig-border border-t-ig-accent" />
      <p className="text-sm text-ig-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-ig-border px-6 py-2 text-sm font-semibold"
        >
          Боз кӯшиш
        </button>
      )}
    </div>
  );
}
