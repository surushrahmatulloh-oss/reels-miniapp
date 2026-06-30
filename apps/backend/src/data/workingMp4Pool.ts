const YOUTUBE = /youtube\.com|youtu\.be/i;

export function isServerPlayableUrl(url: string): boolean {
  return Boolean(url) && /\.mp4(\?|$)/i.test(url) && !YOUTUBE.test(url);
}

export function normalizePlaybackUrl(storedUrl: string | null | undefined): string {
  if (!storedUrl) return '';
  const i = storedUrl.indexOf('#v=minseed_');
  return i > 0 ? storedUrl.slice(0, i) : storedUrl;
}
