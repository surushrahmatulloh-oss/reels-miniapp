import { useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'reels:soundUnlocked';
export const SOUND_UNLOCK_EVENT = 'reels:sound-unlocked';

export function isSoundUnlocked(): boolean {
  return window.sessionStorage.getItem(STORAGE_KEY) === '1';
}

export function unlockSoundGlobal(): boolean {
  if (isSoundUnlocked()) return false;
  window.sessionStorage.setItem(STORAGE_KEY, '1');
  window.localStorage.setItem('reels:muted', '0');
  window.dispatchEvent(new CustomEvent(SOUND_UNLOCK_EVENT));
  return true;
}

export function useSoundUnlock(onUnlocked?: () => void) {
  const unlockedRef = useRef(isSoundUnlocked());
  const onUnlockedRef = useRef(onUnlocked);
  onUnlockedRef.current = onUnlocked;

  const unlock = useCallback(() => {
    if (unlockedRef.current) {
      onUnlockedRef.current?.();
      return false;
    }
    unlockedRef.current = true;
    unlockSoundGlobal();
    onUnlockedRef.current?.();
    return true;
  }, []);

  useEffect(() => {
    const onGesture = () => unlock();
    window.addEventListener('touchstart', onGesture, { once: true, passive: true });
    window.addEventListener('pointerdown', onGesture, { once: true });
    return () => {
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('pointerdown', onGesture);
    };
  }, [unlock]);

  useEffect(() => {
    const handler = () => {
      unlockedRef.current = true;
      onUnlockedRef.current?.();
    };
    window.addEventListener(SOUND_UNLOCK_EVENT, handler);
    return () => window.removeEventListener(SOUND_UNLOCK_EVENT, handler);
  }, []);

  return { unlockedRef, unlock, isUnlocked: () => unlockedRef.current };
}
