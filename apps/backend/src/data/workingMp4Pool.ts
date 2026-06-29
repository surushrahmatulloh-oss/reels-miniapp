const YOUTUBE = /youtube\.com|youtu\.be/i;

export function isServerPlayableUrl(url: string): boolean {
  return Boolean(url) && /\.mp4(\?|$)/i.test(url) && !YOUTUBE.test(url);
}

export function normalizePlaybackUrl(storedUrl: string | null | undefined): string {
  return storedUrl ?? '';
}
