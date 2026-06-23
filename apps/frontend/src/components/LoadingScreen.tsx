interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Бор шуда истодааст...' }: LoadingScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-tg-bg">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      <p className="text-sm text-white/60">{message}</p>
    </div>
  );
}
