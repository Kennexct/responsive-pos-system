import { useState, useEffect, useRef } from 'react';
import localforage from 'localforage';
import { loadFromSupabase, saveToSupabase } from '../services/supabaseSync';
import { isSupabaseConfigured } from '../lib/supabase';

localforage.config({
  name: 'VPos',
  storeName: 'pos_data'
});

/**
 * State persisted to IndexedDB (instant) and Supabase (when configured), scoped per merchant.
 *
 * Saves only happen for the key whose data has finished loading. Without this guard two
 * bugs appeared: defaults overwrote stored data on first mount, and switching merchant
 * wrote the previous merchant's data under the new merchant's key.
 */
export function usePersistentState<T>(key: string, initialValue: T, merchantId?: string): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const storageKey = merchantId ? `${key}_${merchantId}` : key;
  const [state, setState] = useState<T>(initialValue);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let next: T = initialRef.current;
      try {
        const localVal = await localforage.getItem<T>(storageKey);
        if (localVal !== null) next = localVal;
      } catch (err) {
        console.error(`Failed to load ${storageKey} from local storage:`, err);
      }
      if (cancelled) return;
      setState(next);
      setLoadedKey(storageKey);

      if (isSupabaseConfigured) {
        try {
          const remoteVal = await loadFromSupabase<T>(key, merchantId);
          if (!cancelled && remoteVal !== null) {
            setState(remoteVal);
            await localforage.setItem(storageKey, remoteVal);
          }
        } catch (err) {
          console.warn(`Supabase sync failed for ${key}:`, err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [key, storageKey, merchantId]);

  const isLoaded = loadedKey === storageKey;

  useEffect(() => {
    if (!isLoaded) return;
    localforage.setItem(storageKey, state).catch(err => {
      console.error(`Failed to save ${storageKey} locally:`, err);
    });
    if (isSupabaseConfigured) {
      saveToSupabase(key, state, merchantId).catch(err => {
        console.warn(`Failed to save ${key} to Supabase:`, err);
      });
    }
  }, [key, storageKey, state, isLoaded, merchantId]);

  return [state, setState, isLoaded];
}
