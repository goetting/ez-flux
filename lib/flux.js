'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var colorMap = {
  error: 'red',
  action: 'cyan',
  remote: 'magenta',
  tracking: 'gray',
  change: 'green',
  removeListener: 'gray'
};

var Flux = function () {
  function Flux() {
    var _this = this;

    var stateConfig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Flux);

    this.bus = new _eventemitter2.default();
    this.state = {};
    this.stateGetters = { get: function get() {
        return Object.assign({}, _this.state);
      } };
    this.actionTriggers = {};
    this.updateBuffer = [];
    this.updateTimeout = null;

    this.cfg = cfg;

    this.bus.setMaxListeners(cfg.maxListeners);
    this.bus.history = {};

    Object.keys(stateConfig).forEach(function (name) {
      return _this.addStateScope(name, stateConfig[name]);
    });
  }

  /**
                              State Configuration
  */

  _createClass(Flux, [{
    key: 'addStateScope',
    value: function addStateScope(name, _ref) {
      var _this2 = this;

      var state = _ref.state,
          actions = _ref.actions;

      if (!state || (typeof state === 'undefined' ? 'undefined' : _typeof(state)) !== 'object') {
        if (this.cfg.debug) console.error('state "' + name + '" must include a state object'); // eslint-disable-line no-console
        return;
      }
      if (!actions || Object.keys(actions).find(function (key) {
        return typeof actions[key] !== 'function';
      })) {
        if (this.cfg.debug) console.error('state "' + name + '" actions must include dictionary of functions'); // eslint-disable-line no-console
        return;
      }
      this.state[name] = Object.assign({}, state);
      this.stateGetters[name] = { get: function get() {
          return Object.assign({}, _this2.state[name]);
        } };

      Object.keys(actions).forEach(function (actionName) {
        var eventName = _this2.createActionTrigger(name, actionName);
        var action = actions[actionName];
        var setState = function setState(stateChange) {
          if (!stateChange || (typeof stateChange === 'undefined' ? 'undefined' : _typeof(stateChange)) !== 'object') {
            if (_this2.cfg.debug) console.error(name + '.' + actionName + ': setState argument must be Object'); // eslint-disable-line no-console
            return;
          }
          Object.assign(_this2.state[name], stateChange);
          _this2.queueUpdate(name);
        };

        _this2.bus.on(eventName, function (data) {
          action(data, _this2.state[name].get(), setState);
        });
      });
    }
  }, {
    key: 'createActionTrigger',
    value: function createActionTrigger(stateName, actionName) {
      var _this3 = this;

      var eventName = 'action.' + stateName + '.' + actionName;

      if (!this.actionTriggers[stateName]) this.actionTriggers[stateName] = {};
      this.actionTriggers[stateName][actionName] = function (data) {
        return _this3.bus.emit(eventName, data || {});
      };

      return eventName;
    }

    /**
                                Event Handling
    */

  }, {
    key: 'flushUpdates',
    value: function flushUpdates() {
      var key = this.updateBuffer.shift();
      if (!key) return;

      this.emit('state.change.' + key, Object.assign(this.state[key]));
      this.flushUpdates();
    }
  }, {
    key: 'queueUpdate',
    value: function queueUpdate(key) {
      if (this.updateBuffer.indexOf(key) === -1) this.updateBuffer.push(key);
      if (this.cfg.runsInBrowser || this.cfg.throttleUpdates) {
        this.flushUpdates();
        return;
      }

      if (!(this.cfg.runsInBrowser && window.requestAnimationFrame)) {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(this.flushUpdates, 60 / 1000);
      } else {
        window.cancelAnimationFrame(this.updateTimeout);
        this.updateTimeout = window.requestAnimationFrame(this.flushUpdates);
      }
    }
  }, {
    key: 'emit',
    value: function emit() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      if (this.cfg.debug) {
        var data = [].concat(_toConsumableArray(args));
        var time = new Date().getTime();
        var unsub = name === 'removeListener' ? data.shift() : '';
        var msg = 'ezFlux | ' + time + ' ' + name + ' ' + unsub;
        var color = colorMap[name.split('.')[0]] || 'gray';

        this.bus.history[time + ' ' + msg] = { time: time, msg: msg, data: data };

        if (this.cfg.runsInBrowser) {
          var _console;

          if (!this.cfg.logAppState) console.log('%c' + msg, 'color:' + color); // eslint-disable-line no-console
          else (_console = console).log.apply(_console, ['%c' + msg, 'color:' + color, '\n\n'].concat(_toConsumableArray(data), ['\n\n'])); // eslint-disable-line no-console
        }
      }
      this.bus.emit.apply(this.bus, [name].concat(_toConsumableArray(args)));
    }
  }]);

  return Flux;
}();

exports.default = Flux;