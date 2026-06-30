import { useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'reels:soundUnlocked';

export function isSoundUnlocked(): boolean {
  return window.sessionStorage.getItem(STORAGE_KEY) === '1';
}

export function useSoundUnlock() {
  const unlockedRef = useRef(isSoundUnlocked());

  const unlock = useCallback(() => {
    if (unlockedRef.current) return false;
    unlockedRef.current = true;
    window.sessionStorage.setItem(STORAGE_KEY, '1');
    window.localStorage.setItem('reels:muted', '0');
    return true;
  }, []);

  useEffect(() => {
    const onGesture = () => {
      unlock();
    };
    window.addEventListener('touchstart', onGesture, { once: true, passive: true });
    window.addEventListener('click', onGesture, { once: true });
    return () => {
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('click', onGesture);
    };
  }, [unlock]);

  return { unlockedRef, unlock, isUnlocked: () => unlockedRef.current };
}
