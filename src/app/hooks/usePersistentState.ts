import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { loadFromSupabase, saveToSupabase } from '../services/supabaseSync';
import { isSupabaseConfigured } from '../lib/supabase';

localforage.config({
  name: 'VPos',
  storeName: 'pos_data'
});

export function usePersistentState<T>(key: string, initialValue: T, merchantId?: string): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const storageKey = merchantId ? `${key}_${merchantId}` : key;
  const [state, setState] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial data (localforage first for instant render, then Supabase if configured)
  useEffect(() => {
    let isMounted = true;

    async function init() {
      // 1. Fast local load
      try {
        const localVal = await localforage.getItem<T>(storageKey);
        if (isMounted && localVal !== null) {
          setState(localVal);
        }
      } catch (err) {
        console.error(`Failed to load ${storageKey} from localforage:`, err);
      }

      // 2. Cloud Supabase sync
      if (isSupabaseConfigured) {
        try {
          const remoteVal = await loadFromSupabase<T>(key, merchantId);
          if (isMounted && remoteVal !== null) {
            setState(remoteVal);
            await localforage.setItem(storageKey, remoteVal);
          }
        } catch (err) {
          console.warn(`Supabase sync failed for ${key}:`, err);
        }
      }

      if (isMounted) {
        setIsLoaded(true);
      }
    }

    init();
    return () => { isMounted = false; };
  }, [key, storageKey, merchantId]);

  // Save data on change (both localforage & Supabase)
  useEffect(() => {
    if (isLoaded) {
      localforage.setItem(storageKey, state).catch(err => {
        console.error(`Failed to save ${storageKey} to localforage:`, err);
      });

      if (isSupabaseConfigured) {
        saveToSupabase(key, state, merchantId).catch(err => {
          console.warn(`Failed to save ${key} to Supabase:`, err);
        });
      }
    }
  }, [key, storageKey, state, isLoaded, merchantId]);

  return [state, setState, isLoaded];
}
