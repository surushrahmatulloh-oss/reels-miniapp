/**
 * MP4 URLs known to contain audio tracks (GCS samples, MDN cc0).
 */
const GCS = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

export const AUDIO_MP4_URLS: string[] = [
  `${GCS}/ForBiggerBlazes.mp4`,
  `${GCS}/ForBiggerEscapes.mp4`,
  `${GCS}/ForBiggerFun.mp4`,
  `${GCS}/ForBiggerJoyrides.mp4`,
  `${GCS}/ForBiggerMeltdowns.mp4`,
  `${GCS}/Sintel.mp4`,
  `${GCS}/BigBuckBunny.mp4`,
  `${GCS}/ElephantsDream.mp4`,
  `${GCS}/TearsOfSteel.mp4`,
  `${GCS}/VolkswagenGTIReview.mp4`,
  `${GCS}/WeAreGoingOnBullrun.mp4`,
  `${GCS}/WhatCarCanYouGetForAGrand.mp4`,
  `${GCS}/Bears.mp4`,
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  'https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4',
];

/** New app category ids + legacy DB ids */
export const AUDIO_MP4_BY_CATEGORY: Record<string, string> = {
  cars: `${GCS}/WhatCarCanYouGetForAGrand.mp4`,
  sport: `${GCS}/ForBiggerJoyrides.mp4`,
  football: `${GCS}/ForBiggerJoyrides.mp4`,
  music: `${GCS}/ForBiggerFun.mp4`,
  cinema: `${GCS}/Sintel.mp4`,
  tech: `${GCS}/VolkswagenGTIReview.mp4`,
  gaming: `${GCS}/BigBuckBunny.mp4`,
  comedy: `${GCS}/ForBiggerMeltdowns.mp4`,
  news: `${GCS}/WeAreGoingOnBullrun.mp4`,
  nature: 'https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4',
  travel: `${GCS}/ForBiggerEscapes.mp4`,
  cooking: `${GCS}/ForBiggerBlazes.mp4`,
  // legacy ids (existing DB rows)
  food: `${GCS}/ForBiggerBlazes.mp4`,
  fashion: `${GCS}/ForBiggerBlazes.mp4`,
  technology: `${GCS}/VolkswagenGTIReview.mp4`,
  education: `${GCS}/ElephantsDream.mp4`,
  dance: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
  fitness: `${GCS}/ForBiggerJoyrides.mp4`,
  animals: `${GCS}/Bears.mp4`,
  art: `${GCS}/Sintel.mp4`,
  health: `${GCS}/ForBiggerJoyrides.mp4`,
  business: `${GCS}/WhatCarCanYouGetForAGrand.mp4`,
  entertainment: `${GCS}/ForBiggerFun.mp4`,
  animation: `${GCS}/Sintel.mp4`,
  science: `${GCS}/TearsOfSteel.mp4`,
};

export function getAudioUrlForCategory(categoryId: string): string | undefined {
  return AUDIO_MP4_BY_CATEGORY[categoryId];
}

export function urlHasAudio(url: string): boolean {
  if (!url) return false;
  return (
    AUDIO_MP4_URLS.some((a) => url === a || url.includes(a.split('/').pop()!)) ||
    /ForBigger|Sintel|BigBuckBunny|ElephantsDream|TearsOfSteel|friday|ocean_with_audio|Bears\.mp4|Bullrun|WhatCarCanYouGet/i.test(
      url,
    )
  );
}
