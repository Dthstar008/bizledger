import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

export function useFocusLoad(load: () => Promise<void> | void) {
  const inFlightRef = useRef(false);
  const hasFocusedRef = useRef(false);

  const wrappedLoad = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await load();
    } finally {
      inFlightRef.current = false;
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (hasFocusedRef.current) return;
      hasFocusedRef.current = true;
      void wrappedLoad();

      return () => {
        hasFocusedRef.current = false;
      };
    }, [wrappedLoad]),
  );

  return wrappedLoad;
}
