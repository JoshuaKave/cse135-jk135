/**
 * collector-v8.js â€” Analytics Collector with Plugin System
 * CSE 135 - Module 09: Extensions & Plugins
 *
 * Extends previous collectors with:
 *   - use(): Register extensions with {name, init, destroy}
 *   - Extensions receive a limited API (track, set, getConfig, getSessionId)
 *
 * Carries forward from v1â€“v7:
 *   - init(): Configure endpoint, debug mode, sampling
 *   - track(): Send typed events with arbitrary data
 *   - set(): Set persistent properties on all events
 *   - identify(): Associate a user identity with the session
 *   - getSessionId(): Session identity via sessionStorage
 *   - getTechnographics(): Browser, device, screen, network, preferences
 *   - getNavigationTiming(): DNS, TCP, TLS, TTFB, DOM milestones
 *   - getResourceSummary(): Resource counts, sizes, durations by type
 *   - Web Vitals: LCP, CLS, INP via PerformanceObserver
 *   - Error tracking: window.onerror, unhandledrejection
 *   - Cascading delivery: sendBeacon â†’ fetch(keepalive) â†’ fetch
 *
 * Public API: collector.init(), collector.track(), collector.set(),
 *             collector.identify(), collector.use()
 */

(function() {
  'use strict';

  // â”€â”€ Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const config = {
    endpoint: 'https://example.com/collect',
    debug: false,
    sampleRate: 1.0,
    batchSize: 1,
    flushInterval: 5000,
    app: '',
    version: ''
  };

  let initialized = false;
  const properties = {};
  let userId = null;
  const extensions = {};
  const queue = [];

  // â”€â”€ Logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function log(...args) {
    if (config.debug) {
      console.log('[collector-v8]', ...args);
    }
  }

  function warn(...args) {
    console.warn('[collector-v8]', ...args);
  }

  // â”€â”€ Utility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  function merge(target, source) {
    for (const key of Object.keys(source)) {
      target[key] = source[key];
    }
    return target;
  }

  // â”€â”€ Session Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function getSessionId() {
    let sid = sessionStorage.getItem('_collector_sid');
    if (!sid) {
      sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('_collector_sid', sid);
    }
    return sid;
  }

  // â”€â”€ Network Information â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Technographics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Navigation Timing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Resource Timing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    return { totalResources: resources.length, byType: summary };
  }

  // â”€â”€ Web Vitals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  let lcpValue = 0;
  let clsValue = 0;
  let inpValue = 0;

  function observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        lcpValue = last.renderTime || last.loadTime;
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      return observer;
    } catch (e) {
      log('LCP observer not supported');
      return null;
    }
  }

  function observeCLS() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      return observer;
    } catch (e) {
      log('CLS observer not supported');
      return null;
    }
  }

  function observeINP() {
    try {
      const interactions = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId) {
            interactions.push(entry.duration);
          }
        }
        if (interactions.length > 0) {
          interactions.sort((a, b) => b - a);
          inpValue = interactions[0];
        }
      });
      observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      return observer;
    } catch (e) {
      log('INP observer not supported');
      return null;
    }
  }

  function getVitalsScore(metric, value) {
    const thresholds = {
      lcp: [2500, 4000],
      cls: [0.1, 0.25],
      inp: [200, 500]
    };
    const t = thresholds[metric];
    if (!t) return null;
    if (value <= t[0]) return 'good';
    if (value <= t[1]) return 'needsImprovement';
    return 'poor';
  }

  // â”€â”€ Error Tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function initErrorTracking() {
    window.onerror = function(message, source, lineno, colno, error) {
      track('error', {
        message: message,
        source: source,
        lineno: lineno,
        colno: colno,
        stack: error && error.stack ? error.stack.substring(0, 1000) : ''
      });
    };

    window.addEventListener('unhandledrejection', (event) => {
      track('unhandled_rejection', {
        reason: String(event.reason).substring(0, 500)
      });
    });

    log('Error tracking initialized');
  }

  // â”€â”€ Payload Delivery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function send(payload) {
    // Apply sampling
    if (Math.random() > config.sampleRate) {
      log('Sampled out, not sending');
      return;
    }

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(config.endpoint, blob);
      if (sent) {
        log('Beacon sent');
      } else {
        log('sendBeacon returned false, trying fetch');
        fetchFallback(payload);
      }
    } else {
      fetchFallback(payload);
    }

    log('payload:', payload);

    // Dispatch event for test pages
    window.dispatchEvent(new CustomEvent('collector:payload', { detail: payload }));
  }

  function fetchFallback(payload) {
    fetch(config.endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch((err) => {
      warn('fetch fallback error:', err.message);
    });
  }

  // â”€â”€ Core API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Initialize the collector with configuration options.
   */
  function init(options) {
    if (options) {
      merge(config, options);
    }
    initialized = true;

    // Start vitals observers
    observeLCP();
    observeCLS();
    observeINP();

    // Start error tracking
    initErrorTracking();

    log('Initialized with config:', config);

    // Send initial pageview
    window.addEventListener('load', () => {
      setTimeout(() => {
        collect();
      }, 0);
    });

    // Send vitals on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendVitals();
      }
    });
  }

  /**
   * Track a named event with optional data.
   * Used by both the core collector and extensions.
   */
  function track(eventType, data) {
    const payload = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      type: eventType,
      session: getSessionId(),
      data: data || {}
    };

    // Merge persistent properties
    merge(payload, properties);

    if (userId) {
      payload.userId = userId;
    }

    if (config.app) {
      payload.app = config.app;
    }

    send(payload);
  }

  /**
   * Set persistent properties included in every event.
   */
  function set(key, value) {
    if (typeof key === 'object') {
      merge(properties, key);
    } else {
      properties[key] = value;
    }
    log('Properties updated:', properties);
  }

  /**
   * Associate a user identity with the session.
   */
  function identify(id) {
    userId = id;
    log('User identified:', id);
  }

  /**
   * Register an extension with the collector.
   * Extensions must have a name property and an init function.
   */
  function use(extension) {
    if (!extension || !extension.name) {
      warn('Extension must have a name property');
      return;
    }
    if (extensions[extension.name]) {
      warn(`Extension "${extension.name}" already registered`);
      return;
    }

    extensions[extension.name] = extension;

    // Call init, passing the collector's limited public API
    if (typeof extension.init === 'function') {
      extension.init({
        track: track,
        set: set,
        getConfig: () => config,
        getSessionId: getSessionId
      });
    }

    log('Extension registered:', extension.name);
  }

  // â”€â”€ Collect & Send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    merge(payload, properties);

    if (userId) {
      payload.userId = userId;
    }

    if (config.app) {
      payload.app = config.app;
    }

    send(payload);
  }

  function sendVitals() {
    const vitals = {
      lcp: { value: round(lcpValue), score: getVitalsScore('lcp', lcpValue) },
      cls: { value: round(clsValue * 1000) / 1000, score: getVitalsScore('cls', clsValue) },
      inp: { value: round(inpValue), score: getVitalsScore('inp', inpValue) }
    };
    send({
      type: 'vitals',
      vitals: vitals,
      url: window.location.href,
      session: getSessionId(),
      timestamp: new Date().toISOString()
    });
  }

  // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  window.collector = {
    init: init,
    track: track,
    set: set,
    identify: identify,
    use: use
  };

  // Also expose internals for test pages
  window.__collector = {
    getNavigationTiming: getNavigationTiming,
    getResourceSummary: getResourceSummary,
    getTechnographics: getTechnographics,
    getSessionId: getSessionId,
    getNetworkInfo: getNetworkInfo,
    getVitalsScore: getVitalsScore,
    getExtensions: () => extensions,
    collect: collect
  };

})();