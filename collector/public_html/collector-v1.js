(function() {
  'use strict';

  // In production, this would point to your analytics server
  // For demo purposes, we log to console and attempt the beacon
  const endpoint = '/collect';

  // collector-v1.js â€” Minimal Analytics Beacon
// Collects: page URL, title, referrer, timestamp
// Sends: JSON payload via navigator.sendBeacon()

function getTechnographics() {
  // Network info (feature-detected)
  let networkInfo = {};
  if ('connection' in navigator) {
    const conn = navigator.connection;
    networkInfo = {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }

  return {
    // Browser identification
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,

    // Viewport (current browser window)
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,

    // Screen (physical display)
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio,

    // Hardware
    cores: navigator.hardwareConcurrency || 0,
    memory: navigator.deviceMemory || 0,

    // Network
    network: networkInfo,

    // Preferences
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

function getSessionId() {
  let sid = sessionStorage.getItem('_collector_sid');
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('_collector_sid', sid);
  }
  return sid;
}

  function collect() {
    const payload = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      type: 'pageview',
      technographics: getTechnographics(),
      session: getSessionId() 
    };

    // Log to console so you can see what would be sent
    console.log('[Collector v1] Sending beacon:', payload);

    const blob = new Blob(
      [JSON.stringify(payload)],
      { type: 'application/json' }
    );

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(endpoint, blob);
      console.log('[Collector v1] sendBeacon returned:', sent);
    } else {
      console.log('[Collector v1] sendBeacon not available, using fetch fallback');
      fetch(endpoint, {
        method: 'POST',
        body: blob,
        keepalive: true
      }).catch((err) => {
        console.log('[Collector v1] fetch fallback error:', err.message);
      });
    }
  }

  // Fire on page load
  if (document.readyState === 'complete') {
    collect();
  } else {
    window.addEventListener('load', collect);
  }

  // Also fire when user leaves (captures time-on-page)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      collect();
    }
  });
})();

