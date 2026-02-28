/**
 * ext-keyboard.js — Keyboard Activity Extension
 * CSE 135 - Keyboard Tracking
 *
 * Tracks all keyboard activity:
 *   - Keydown events (key pressed)
 *   - Keyup events (key released)
 *   - Key hold duration
 *   - Typing patterns
 *   - Reports data on page exit
 *
 * Register with: collector.use(KeyboardTracker)
 */

window.KeyboardTracker = {
  name: 'keyboard-tracker',

  _collector: null,
  _keydowns: [],
  _keyups: [],
  _keyHolds: {},         
  _keydownHandler: null,
  _keyupHandler: null,
  _visibilityHandler: null,

  MAX_EVENTS: 200,
  init: function(collector) {
    var self = this;
    self._collector = collector;
    self._keydowns = [];
    self._keyups = [];
    self._keyHolds = {};

    function getTargetInfo(target) {
      if (!target || !target.tagName) {
        return { tag: 'unknown', id: null, classes: null };
      }
      return {
        tag: target.tagName,
        id: target.id || null,
        classes: target.className || null
      };
    }

    self._keydownHandler = function(event) {
      var now = Date.now();
      var target = event.target;

      var keyData = {
        type: 'keydown',
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        modifiers: {
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          meta: event.metaKey
        },
        repeat: event.repeat,
        target: getTargetInfo(target),
        timestamp: now
      };

      if (!event.repeat && !self._keyHolds[event.code]) {
        self._keyHolds[event.code] = now;
      }

      self._keydowns.push(keyData);

      if (self._keydowns.length > self.MAX_EVENTS) {
        self._keydowns.shift();
      }
    };

    self._keyupHandler = function(event) {
      var now = Date.now();
      var target = event.target;

      var holdDuration = null;
      if (self._keyHolds[event.code]) {
        holdDuration = now - self._keyHolds[event.code];
        delete self._keyHolds[event.code];
      }

      var keyData = {
        type: 'keyup',
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        modifiers: {
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          meta: event.metaKey
        },
        holdDuration: holdDuration,
        target: getTargetInfo(target),
        timestamp: now
      };

      self._keyups.push(keyData);
      if (self._keyups.length > self.MAX_EVENTS) {
        self._keyups.shift();
      }
    };

    self._visibilityHandler = function() {
      if (document.visibilityState === 'hidden') {
        self._reportFinal();
      }
    };

    document.addEventListener('keydown', self._keydownHandler);
    document.addEventListener('keyup', self._keyupHandler);
    document.addEventListener('visibilitychange', self._visibilityHandler);
  },

  /**
   * Get all captured keydown events.
   */
  getKeydowns: function(clear) {
    var events = this._keydowns.slice();
    if (clear) {
      this._keydowns.length = 0;
    }
    return events;
  },

  /**
   * Get all captured keyup events.
   */
  getKeyups: function(clear) {
    var events = this._keyups.slice();
    if (clear) {
      this._keyups.length = 0;
    }
    return events;
  },

  /**
   * Get combined keyboard activity summary.
   */
  getActivity: function(clear) {
    return {
      keydowns: this.getKeydowns(clear),
      keyups: this.getKeyups(clear)
    };
  },

  /**
   * Report final keyboard activity summary on page exit.
   */
  _reportFinal: function() {
    var activity = this.getActivity(true);
    
    if (activity.keydowns.length > 0 || activity.keyups.length > 0) {
      this._collector.track('keyboard_activity', {
        keydownCount: activity.keydowns.length,
        keyupCount: activity.keyups.length,
        keydowns: activity.keydowns,
        keyups: activity.keyups
      });
    }
  },

  onExit: function(payload) {
    var activity = this.getActivity(true);
    payload.activity = payload.activity || {};
    payload.activity.keyboard = {
      keydownCount: activity.keydowns.length,
      keyupCount: activity.keyups.length,
      keydowns: activity.keydowns,
      keyups: activity.keyups
    };
  },

  destroy: function() {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    if (this._keyupHandler) {
      document.removeEventListener('keyup', this._keyupHandler);
      this._keyupHandler = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }
};