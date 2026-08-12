import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { loadFromSupabase, saveToSupabase } from '../services/supabaseSync';
import { isSupabaseConfigured } from '../lib/supabase';

localforage.config({
  name: 'VPos',
  storeName: 'pos_data'
});

export function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial data (localforage first for instant render, then Supabase if configured)
  useEffect(() => {
    let isMounted = true;

    async function init() {
      // 1. Fast local load
      try {
        const localVal = await localforage.getItem<T>(key);
        if (isMounted && localVal !== null) {
          setState(localVal);
        }
      } catch (err) {
        console.error(`Failed to load ${key} from localforage:`, err);
      }

      // 2. Cloud Supabase sync
      if (isSupabaseConfigured) {
        try {
          const remoteVal = await loadFromSupabase<T>(key);
          if (isMounted && remoteVal !== null) {
            setState(remoteVal);
            await localforage.setItem(key, remoteVal);
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
  }, [key]);

  // Save data on change (both localforage & Supabase)
  useEffect(() => {
    if (isLoaded) {
      localforage.setItem(key, state).catch(err => {
        console.error(`Failed to save ${key} to localforage:`, err);
      });

      if (isSupabaseConfigured) {
        saveToSupabase(key, state).catch(err => {
          console.warn(`Failed to save ${key} to Supabase:`, err);
        });
      }
    }
  }, [key, state, isLoaded]);

  return [state, setState, isLoaded];
}
