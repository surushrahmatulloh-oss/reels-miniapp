/** MP4 URLs verified to stream from server (no 403 hotlink block) */
export const WORKING_MP4_POOL = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
  'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
  'https://samplelib.com/lib/preview/mp4/sample-15s.mp4',
  'https://samplelib.com/lib/preview/mp4/sample-20s.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
];

const BLOCKED = /youtube\.com|youtu\.be|videos\.pexels\.com|commondatastorage\.googleapis\.com/i;

export function isServerPlayableUrl(url: string): boolean {
  if (!url || BLOCKED.test(url)) return false;
  return WORKING_MP4_POOL.some((w) => url.startsWith(w.split('?')[0]!)) ||
    /\.mp4(\?|$)/i.test(url) && !BLOCKED.test(url) && (
      /interactive-examples\.mdn|w3schools\.com|samplelib\.com|test-videos\.co\.uk/i.test(url)
    );
}

export function pickWorkingMp4Url(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return WORKING_MP4_POOL[hash % WORKING_MP4_POOL.length]!;
}

export function normalizePlaybackUrl(storedUrl: string | null | undefined, videoId: string): string {
  if (storedUrl && isServerPlayableUrl(storedUrl)) return storedUrl;
  return pickWorkingMp4Url(videoId);
}
