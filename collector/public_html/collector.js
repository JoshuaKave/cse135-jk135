// collector-v3.js â€” Analytics Collector with Configurable Endpoint
// Extends v1/v2: technographics, session identity, configurable endpoint,
// and cascading delivery (sendBeacon â†’ fetch keepalive â†’ fetch)
//
// Change ENDPOINT to point at your analytics server.

(function() {
  'use strict';

  // ---- Configuration ----
  const ENDPOINT = 'https://collector.jk135.site/collect'; // Change to your endpoint URL

  // ---- Session Identity (same approach as v2) ----
  const sessionId = (function() {
    const key = '_collector_sid';
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(key, id);
    return id;
  })();

  // ---- Technographic Data ----
  function getTechData() {
    const data = {
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };

    // Network Information API (Chromium browsers)
    if (navigator.connection) {
      data.connectionType = navigator.connection.effectiveType || '';
      data.connectionDownlink = navigator.connection.downlink || '';
    }

    return data;
  }

  // ---- Cascading Delivery ----
  function send(payload) {
    const json = JSON.stringify(payload);
    const blob = new Blob([json], { type: 'application/json' });

    console.log(`[Collector v3] Sending to ${ENDPOINT}:`, payload);

    // Strategy 1: sendBeacon (preferred â€” survives unload)
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(ENDPOINT, blob);
      if (sent) {
        console.log('[Collector v3] sendBeacon succeeded');
        return;
      }
      console.log('[Collector v3] sendBeacon returned false, trying fetch');
    }

    // Strategy 2: fetch with keepalive (survives unload, has response)
    fetch(ENDPOINT, {
      method: 'POST',
      body: json,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).then((resp) => {
      console.log('[Collector v3] fetch(keepalive) status:', resp.status);
    }).catch(() => {
      console.log('[Collector v3] fetch(keepalive) failed, trying plain fetch');
      // Strategy 3: plain fetch (last resort)
      fetch(ENDPOINT, {
        method: 'POST',
        body: json,
        headers: { 'Content-Type': 'application/json' }
      }).then((resp) => {
        console.log('[Collector v3] plain fetch status:', resp.status);
      }).catch((err) => {
        console.log('[Collector v3] all delivery methods failed:', err.message);
      });
    });
  }

  // ---- Collect and Send ----
  function collect(eventType) {
    const payload = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      type: eventType || 'pageview',
      sessionId: sessionId,
      tech: getTechData()
    };

    send(payload);
  }

  // ---- Custom Event API ----
  // Expose a function for sending custom events from the page
  window.__collectorSendEvent = (eventType, eventData) => {
    const payload = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      type: eventType || 'custom',
      sessionId: sessionId,
      data: eventData || {}
    };

    send(payload);
  };

  // ---- Triggers ----

  // Fire on page load
  if (document.readyState === 'complete') {
    collect('pageview');
  } else {
    window.addEventListener('load', () => {
      collect('pageview');
    });
  }

  // Fire when user leaves (captures departures)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      collect('pagehide');
    }
  });
})();