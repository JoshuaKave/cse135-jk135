/**
 * collector-v5.js â€” Analytics Collector with Web Vitals
 * CSE 135 - Module 06: Web Vitals
 *
 * Extends previous collectors with:
 *   - observeLCP(): Largest Contentful Paint via PerformanceObserver
 *   - observeCLS(): Cumulative Layout Shift via PerformanceObserver
 *   - observeINP(): Interaction to Next Paint via PerformanceObserver
 *   - getVitalsScore(): threshold-based scoring (good/needsImprovement/poor)
 *   - Sends initial beacon on load (timing + technographics)
 *   - Sends vitals beacon on visibilitychange hidden
 *
 * Carries forward from v4:
 *   - getSessionId(): session identity via sessionStorage
 *   - getTechnographics(): browser, device, screen, network, preferences
 *   - getNavigationTiming(): DNS, TCP, TLS, TTFB, DOM milestones
 *   - getResourceSummary(): resource counts, sizes, durations by type
 *
 * Usage: Include this script in any HTML page.
 *        Open the browser console to see collected data.
 */

(function () {
  'use strict';

  // Configuration
  const ENDPOINT = 'https://example.com/collect';  // Replace with your endpoint

  // Utility
  /**
   * Round a number to two decimal places.
   */
  function round(n) {
    return Math.round(n * 100) / 100;
  }

  // Session Identity

  /**
   * Generate or retrieve a session ID from sessionStorage.
   * Persists across page navigations within the same tab.
   * Clears automatically when the tab or browser closes.
   */
  function getSessionId() {
    let sid = sessionStorage.getItem('_collector_sid');
    if (!sid) {
      sid = `${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      sessionStorage.setItem('_collector_sid', sid);
    }
    return sid;
  }

  // Network Information

  /**
   * Collect network connection data via the Network Information API.
   * Returns an empty object if the API is unavailable.
   */
  function getNetworkInfo() {
    if (!('connection' in navigator)) return {};

    const conn = navigator.connection;
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }

  // Technographics

  /**
   * Collect a complete technographic profile of the user's environment.
   */
  function getTechnographics() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio,
      cores: navigator.hardwareConcurrency || 0,
      memory: navigator.deviceMemory || 0,
      network: getNetworkInfo(),
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Navigation Timing

  /**
   * Extract key performance milestones from the Navigation Timing API.
   */
  function getNavigationTiming() {
    const entries = performance.getEntriesByType('navigation');
    if (!entries.length) return {};

    const n = entries[0];

    return {
      dnsLookup: round(n.domainLookupEnd - n.domainLookupStart),
      tcpConnect: round(n.connectEnd - n.connectStart),
      tlsHandshake: n.secureConnectionStart > 0
        ? round(n.connectEnd - n.secureConnectionStart) : 0,
      ttfb: round(n.responseStart - n.requestStart),
      download: round(n.responseEnd - n.responseStart),
      domInteractive: round(n.domInteractive - n.fetchStart),
      domComplete: round(n.domComplete - n.fetchStart),
      loadEvent: round(n.loadEventEnd - n.fetchStart),
      fetchTime: round(n.responseEnd - n.fetchStart),
      transferSize: n.transferSize,
      headerSize: n.transferSize - n.encodedBodySize
    };
  }

  // Resource Timing

  /**
   * Aggregate resource timing data by initiator type.
   */
  function getResourceSummary() {
    const resources = performance.getEntriesByType('resource');

    const summary = {
      script:         { count: 0, totalSize: 0, totalDuration: 0 },
      link:           { count: 0, totalSize: 0, totalDuration: 0 },
      img:            { count: 0, totalSize: 0, totalDuration: 0 },
      font:           { count: 0, totalSize: 0, totalDuration: 0 },
      fetch:          { count: 0, totalSize: 0, totalDuration: 0 },
      xmlhttprequest: { count: 0, totalSize: 0, totalDuration: 0 },
      other:          { count: 0, totalSize: 0, totalDuration: 0 }
    };

    resources.forEach((r) => {
      const type = summary[r.initiatorType] ? r.initiatorType : 'other';
      summary[type].count++;
      summary[type].totalSize += r.transferSize || 0;
      summary[type].totalDuration += r.duration || 0;
    });

    return {
      totalResources: resources.length,
      byType: summary
    };
  }

  // Web Vitals: Thresholds & Scoring

  const thresholds = {
    lcp: [2500, 4000],
    cls: [0.1, 0.25],
    inp: [200, 500]
  };

  /**
   * Classify a vital metric value as good, needsImprovement, or poor.
   */
  function getVitalsScore(metric, value) {
    const t = thresholds[metric];
    if (!t) return null;
    if (value <= t[0]) return 'good';
    if (value <= t[1]) return 'needsImprovement';
    return 'poor';
  }

  // Web Vitals: Observers

  let lcpValue = 0;
  let clsValue = 0;
  let inpValue = 0;
  const inpInteractions = [];

  /**
   * Observe Largest Contentful Paint.
   * LCP fires multiple times as larger elements render.
   * The last entry before user interaction is the final LCP.
   */
  function observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        // renderTime is preferred; loadTime is fallback for cross-origin images
        lcpValue = lastEntry.renderTime || lastEntry.loadTime;
        console.log(`[collector-v5] LCP updated: ${round(lcpValue)}ms`,
          `(${getVitalsScore('lcp', lcpValue)})`);
        // Dispatch event for test page
        window.dispatchEvent(new CustomEvent('collector:vitals-update', {
          detail: { lcp: lcpValue, cls: clsValue, inp: inpValue }
        }));
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      return observer;
    } catch (e) {
      console.warn('[collector-v5] LCP observer not supported:', e.message);
      return null;
    }
  }

  /**
   * Observe Cumulative Layout Shift.
   * Accumulates shift values, excluding shifts caused by recent user input.
   */
  function observeCLS() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count shifts without recent user input
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        console.log(`[collector-v5] CLS updated: ${Math.round(clsValue * 1000) / 1000}`,
          `(${getVitalsScore('cls', clsValue)})`);
        // Dispatch event for test page
        window.dispatchEvent(new CustomEvent('collector:vitals-update', {
          detail: { lcp: lcpValue, cls: clsValue, inp: inpValue }
        }));
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      return observer;
    } catch (e) {
      console.warn('[collector-v5] CLS observer not supported:', e.message);
      return null;
    }
  }

  /**
   * Observe Interaction to Next Paint.
   * Tracks all interactions and reports the worst (simplified from 98th percentile).
   */
  function observeINP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          // event entries with interactionId represent user interactions
          if (entry.interactionId) {
            inpInteractions.push(entry.duration);
          }
        }
        // INP is the worst interaction (simplified)
        if (inpInteractions.length > 0) {
          inpInteractions.sort((a, b) => b - a);
          inpValue = inpInteractions[0];
        }
        console.log(`[collector-v5] INP updated: ${round(inpValue)}ms`,
          `(${getVitalsScore('inp', inpValue)})`,
          `(${inpInteractions.length} interactions)`);
        // Dispatch event for test page
        window.dispatchEvent(new CustomEvent('collector:vitals-update', {
          detail: { lcp: lcpValue, cls: clsValue, inp: inpValue }
        }));
      });
      observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      return observer;
    } catch (e) {
      console.warn('[collector-v5] INP observer not supported:', e.message);
      return null;
    }
  }

  // Payload Delivery

  /**
   * Send the payload to the analytics endpoint via sendBeacon,
   * falling back to fetch with keepalive.
   */
  function send(payload) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, blob);
      console.log(`[collector-v5] Beacon sent (${payload.type})`);
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        body: blob,
        keepalive: true
      }).catch((err) => {
        console.warn('[collector-v5] fetch fallback error:', err.message);
      });
    }

    console.log('[collector-v5] payload:', payload);
  }

  // Collect & Send

  /**
   * Build the full analytics payload (pageview) and send it.
   * Includes page data, session, technographics, and performance timing.
   */
  function collect() {
    const payload = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      type: 'pageview',
      session: getSessionId(),
      technographics: getTechnographics(),
      timing: getNavigationTiming(),
      resources: getResourceSummary()
    };

    send(payload);

    // Dispatch a custom event so test pages can read the payload
    window.dispatchEvent(new CustomEvent('collector:payload', { detail: payload }));
  }

  /**
   * Build and send the vitals beacon with final metric values.
   */
  function sendVitals() {
    const vitals = {
      lcp: { value: round(lcpValue), score: getVitalsScore('lcp', lcpValue) },
      cls: { value: Math.round(clsValue * 1000) / 1000, score: getVitalsScore('cls', clsValue) },
      inp: { value: round(inpValue), score: getVitalsScore('inp', inpValue) }
    };

    const payload = {
      type: 'vitals',
      vitals: vitals,
      url: window.location.href,
      session: getSessionId(),
      timestamp: new Date().toISOString()
    };

    send(payload);

    // Dispatch a custom event so test pages can read the vitals
    window.dispatchEvent(new CustomEvent('collector:vitals', { detail: payload }));
  }

  // Start Observers
  // Start immediately so buffered entries from before script load are captured.

  console.log('[collector-v5] Starting Web Vitals observers');
  const lcpObserver = observeLCP();
  const clsObserver = observeCLS();
  const inpObserver = observeINP();

  // Triggers

  // Initial beacon: collect timing + technographics after load
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.log('[collector-v5] Page loaded â€” collecting timing data');
      collect();
    }, 0);
  });

  // Vitals beacon: send final values when the page is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log('[collector-v5] Page hidden â€” sending vitals beacon');
      sendVitals();
    }
  });

  // Expose for test page

  window.__collector = {
    getNavigationTiming: getNavigationTiming,
    getResourceSummary: getResourceSummary,
    getTechnographics: getTechnographics,
    getSessionId: getSessionId,
    getNetworkInfo: getNetworkInfo,
    getVitalsScore: getVitalsScore,
    getVitals: () => ({
      lcp: { value: round(lcpValue), score: getVitalsScore('lcp', lcpValue) },
      cls: { value: Math.round(clsValue * 1000) / 1000, score: getVitalsScore('cls', clsValue) },
      inp: { value: round(inpValue), score: getVitalsScore('inp', inpValue) }
    }),
    collect: collect,
    sendVitals: sendVitals
  };

})();