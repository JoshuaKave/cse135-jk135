/**
 * ext-click.js — Mouse Activity Extension
 * CSE 135 - Mouse Tracking (Clicks + Movement)
 *
 * Tracks all mouse activity:
 *   - Click events (coordinates, button, target element)
 *   - Mouse movement (throttled cursor positions)
 *   - Reports data on page exit
 *
 * Register with: collector.use(MouseTracker)
 */

window.MouseTracker = {
  name: 'mouse-tracker',

  _collector: null,
  _clicks: [],
  _movements: [],
  _lastMoveTime: 0,
  _clickHandler: null,
  _moveHandler: null,
  _visibilityHandler: null,

  // Configuration
  MAX_MOVEMENTS: 100,
  MAX_CLICKS: 50,
  THROTTLE_MS: 100,

  init: function(collector) {
    var self = this;
    self._collector = collector;
    self._clicks = [];
    self._movements = [];
    self._lastMoveTime = 0;

    // Click tracking
    self._clickHandler = function(event) {
      var target = event.target;
      var clickData = {
        x: event.clientX,
        y: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
        button: event.button, // 0=left, 1=middle, 2=right
        target: {
          tag: target.tagName,
          id: target.id || null,
          classes: target.className || null,
          text: (target.innerText || '').substring(0, 50)
        },
        timestamp: Date.now()
      };

      self._clicks.push(clickData);

      // Cap the buffer
      if (self._clicks.length > self.MAX_CLICKS) {
        self._clicks.shift();
      }

      // Send individual click event
      self._collector.track('click', clickData);
    };

    // Mouse movement tracking (throttled)
    self._moveHandler = function(event) {
      var now = Date.now();

      // Throttle: only capture if enough time has passed
      if (now - self._lastMoveTime < self.THROTTLE_MS) return;
      self._lastMoveTime = now;

      var movement = {
        x: event.clientX,
        y: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
        timestamp: now
      };

      self._movements.push(movement);

      // Cap the buffer
      if (self._movements.length > self.MAX_MOVEMENTS) {
        self._movements.shift();
      }
    };

    // Report on page exit
    self._visibilityHandler = function() {
      if (document.visibilityState === 'hidden') {
        self._reportFinal();
      }
    };

    document.addEventListener('click', self._clickHandler);
    document.addEventListener('mousemove', self._moveHandler);
    document.addEventListener('visibilitychange', self._visibilityHandler);
  },

  /**
   * Get all captured clicks.
   */
  getClicks: function(clear) {
    var clicks = this._clicks.slice();
    if (clear) {
      this._clicks.length = 0;
    }
    return clicks;
  },

  /**
   * Get all captured mouse movements.
   */
  getMovements: function(clear) {
    var movements = this._movements.slice();
    if (clear) {
      this._movements.length = 0;
    }
    return movements;
  },

  /**
   * Report final mouse activity summary on page exit.
   */
  _reportFinal: function() {
    this._collector.track('mouse_activity', {
      clicks: this.getClicks(true),
      movements: this.getMovements(true)
    });
  },

  /**
   * Called by collector on page exit - augment exit payload.
   */
  onExit: function(payload) {
    payload.activity = payload.activity || {};
    payload.activity.clicks = this.getClicks(true);
    payload.activity.movements = this.getMovements(true);
  },

  destroy: function() {
    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    if (this._moveHandler) {
      document.removeEventListener('mousemove', this._moveHandler);
      this._moveHandler = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }
};