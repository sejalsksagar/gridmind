import { useState, useEffect } from 'react';

/**
 * The MapmyIndia (Mappls) SDK is not a module — it's loaded via a CDN <script>
 * tag in index.html, which announces readiness through the `callback` query
 * param pointed at `window.onMapplsSDKReady`. That handler sets
 * `window.mapplsSDKReady` and dispatches a 'mappls-sdk-ready' event.
 *
 * This hook listens for that event rather than polling for `typeof mappls`,
 * which avoids the race where polling could check at the wrong moment relative
 * to the SDK's actual init sequence. It also checks the flag synchronously on
 * mount, in case the SDK finished loading before this component rendered.
 */
export function useMapmyIndia() {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (window.mapplsSDKReady) {
      setMapReady(true);
      return;
    }

    function handleReady() {
      setMapReady(true);
    }

    window.addEventListener('mappls-sdk-ready', handleReady);
    return () => window.removeEventListener('mappls-sdk-ready', handleReady);
  }, []);

  return { mapReady };
}
