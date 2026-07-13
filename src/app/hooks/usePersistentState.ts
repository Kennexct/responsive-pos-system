import { useState, useEffect } from 'react';
import localforage from 'localforage';

localforage.config({
  name: 'NexaPOS',
  storeName: 'pos_data'
});

export function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    localforage.getItem<T>(key).then((val) => {
      if (isMounted) {
        if (val !== null) {
          setState(val);
        }
        setIsLoaded(true);
      }
    }).catch((err) => {
      console.error(`Failed to load ${key} from localforage:`, err);
      if (isMounted) setIsLoaded(true);
    });
    return () => { isMounted = false; };
  }, [key]);

  // Save data on change
  useEffect(() => {
    if (isLoaded) {
      localforage.setItem(key, state).catch(err => {
        console.error(`Failed to save ${key} to localforage:`, err);
      });
    }
  }, [key, state, isLoaded]);

  return [state, setState, isLoaded];
}
