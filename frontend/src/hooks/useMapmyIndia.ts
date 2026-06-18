import { useState, useEffect } from 'react';

/**
 * The MapmyIndia SDK loads asynchronously from a CDN <script> tag (see index.html).
 * There is no module to import and no load event we can reliably hook into across
 * browsers, so we poll for the global `mappls` object until it exists.
 */
export function useMapmyIndia() {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (typeof mappls !== 'undefined') {
      setMapReady(true);
      return;
    }

    const interval = setInterval(() => {
      if (typeof mappls !== 'undefined') {
        setMapReady(true);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return { mapReady };
}
