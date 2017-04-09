'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var colorMap = { RESET: 'red', trigger: 'cyan', change: 'green' };
var isFn = function isFn(fn) {
  return typeof fn === 'function';
};

var EZFlux = function () {
  _createClass(EZFlux, null, [{
    key: 'getEventNames',
    value: function getEventNames(stateName) {
      var actionName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      return {
        triggered: 'triggered:action.' + stateName + '.' + actionName,
        canceled: 'canceled:action.' + stateName + '.' + actionName,
        change: 'change:state.' + stateName,
        reset: 'RESET:state.' + stateName
      };
    }
  }, {
    key: 'getActionCycle',
    value: function getActionCycle(action, beforeActions, afterActions) {
      var cycle = [action];

      if (beforeActions) cycle.push(beforeActions);
      if (afterActions) cycle.unshift(afterActions);

      return cycle;
    }
  }, {
    key: 'validateScope',
    value: function validateScope(name, _ref) {
      var values = _ref.values,
          actions = _ref.actions,
          afterActions = _ref.afterActions,
          beforeActions = _ref.beforeActions;

      if (!values || (typeof values === 'undefined' ? 'undefined' : _typeof(values)) !== 'object') {
        throw new Error('ezFlux: "' + name + '" - must include a values object');
      }
      if (!actions || Object.keys(actions).find(function (key) {
        return !isFn(actions[key]);
      })) {
        throw new Error('ezFlux: "' + name + '" - actions must include dictionary of functions');
      }
      if (afterActions && !isFn(afterActions)) {
        throw new Error('ezFlux: "' + name + '" - \'afterActions\' must be a function or undefined');
      }
      if (beforeActions && !isFn(beforeActions)) {
        throw new Error('ezFlux: "' + name + '" - \'beforeActions\' must be a function or undefined');
      }
    }
  }]);

  function EZFlux() {
    var stateCfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, EZFlux);

    this.history = {};
    this.config = {};
    this.runsInBrowser = typeof window !== 'undefined' && !!window.requestAnimationFrame;
    this.actions = {};
    this.emissionTimeout = null;
    this.defaultState = {};
    this.state = {};
    this.events = {};
    this.removeListener = this.off;
    this.plugins = {};

    var scopeNames = Object.keys(stateCfg);
    var initState = options.initialState || {};

    this.config = options;

    for (var i = scopeNames.length; i--;) {
      var _name = scopeNames[i];
      var scopeConfig = stateCfg[_name];

      this.constructor.validateScope(_name, scopeConfig);

      this.state[_name] = _extends({}, scopeConfig.values);
      this.defaultState[_name] = _extends({}, scopeConfig.values);
      if (initState[_name]) Object.assign(this.state[_name], initState[_name]);
      Object.freeze(this.state[_name]);

      this.addScopeToEventSystem(_name, scopeConfig);
    }
    Object.freeze(this.state);

    if (options.plugins) {
      for (var _i = options.plugins.length; _i--;) {
        this.plug(options.plugins[_i]);
      }delete this.config.plugins;
    }
  }

  _createClass(EZFlux, [{
    key: 'addScopeToEventSystem',
    value: function addScopeToEventSystem(scopeName, scopeConfig) {
      var _this = this;

      var actionNames = Object.keys(scopeConfig.actions);
      var beforeActions = scopeConfig.beforeActions,
          afterActions = scopeConfig.afterActions,
          actions = scopeConfig.actions;


      this.actions[scopeName] = {};

      var _loop = function _loop(i) {
        var actionName = actionNames[i];
        var eventNames = _this.constructor.getEventNames(scopeName, actionName);
        var action = actions[actionName];
        var actionCycle = _this.constructor.getActionCycle(action, beforeActions, afterActions);
        var listener = _this.getActionListener(scopeName, actionName, actionCycle, eventNames);
        var trigger = function trigger(payload) {
          return new Promise(function (res) {
            return _this.emit(eventNames.triggered, payload, res);
          });
        }; // eslint-disable-line no-loop-func

        _this.actions[scopeName][actionName] = trigger;
        _this.on(eventNames.triggered, listener);
      };

      for (var i = actionNames.length; i--;) {
        _loop(i);
      }
    }
  }, {
    key: 'getActionListener',
    value: function getActionListener(scopeName, actionName, actionCycle, eventNames) {
      var _this2 = this;

      return function (payload, res) {
        var i = actionCycle.length - 1;
        var stateChange = Object.seal(_extends({}, _this2.state[scopeName]));
        var runSeries = function runSeries(actions, cb) {
          var result = actions[i](payload, stateChange, _this2, actionName);
          var validateActionResult = function validateActionResult(actionResult) {
            if (!actionResult || (typeof actionResult === 'undefined' ? 'undefined' : _typeof(actionResult)) !== 'object') {
              cb(false);
              return;
            }
            Object.assign(stateChange, actionResult);
            i -= 1;
            if (actions[i]) runSeries(actions, cb);else cb(true);
          };

          if (!result || !result.then) validateActionResult(result);else result.then(validateActionResult);
        };

        runSeries(actionCycle, function (success) {
          if (success) {
            _this2.setStateScope(scopeName, stateChange);
            _this2.emit(eventNames.change);
          } else {
            _this2.emit(eventNames.canceled);
          }
          res();
        });
      };
    }
  }, {
    key: 'setStateScope',
    value: function setStateScope(name, newState) {
      this.state = _extends({}, this.state);
      this.state[name] = _extends({}, newState);
      Object.freeze(this.state);
      Object.freeze(this.state[name]);
    }
  }, {
    key: 'logEmission',
    value: function logEmission() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var payload = arguments[1];

      if (this.config.recordHistory) {
        var _time = Date.now();
        var _state = {};
        var scopes = Object.keys(this.state);

        for (var i = scopes.length; i--;) {
          _state[scopes[i]] = _extends({}, this.state[scopes[i]]);
        }this.history[_time] = { time: _time, name: name, state: _state, payload: payload };
      }

      if (this.config.console && console[this.config.console]) {
        // eslint-disable-line no-console
        var logger = console[this.config.console]; // eslint-disable-line no-console
        var msg = 'ezFlux | ' + name;
        var color = colorMap[name.split(':')[0]] || 'gray';
        logger.apply(undefined, _toConsumableArray(this.runsInBrowser ? ['%c' + msg, 'color:' + color] : [msg]));
      }
    }
  }, {
    key: 'emit',
    value: function emit() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var payload = arguments[1];
      var resolver = arguments[2];

      this.logEmission(name, payload);
      if (!this.events[name]) return;
      for (var i = this.events[name].length; i--;) {
        this.events[name][i](payload, resolver);
      }
    }
  }, {
    key: 'on',
    value: function on(name, fn) {
      if (!this.events[name]) this.events[name] = [fn];else this.events[name].push(fn);
    }
  }, {
    key: 'once',
    value: function once(name, fn) {
      var _this3 = this;

      this.on(name, function () {
        fn.apply(undefined, arguments);
        _this3.off(name, fn);
      });
    }
  }, {
    key: 'off',
    value: function off(name, fn) {
      if (!this.events[name]) return;
      var i = this.events[name].findIndex(function (handler) {
        return handler === fn;
      });

      if (i > -1) this.events[name].splice(i, 1);
    }
  }, {
    key: 'resetStateScope',
    value: function resetStateScope(name) {
      if (!this.defaultState[name]) throw new Error('ezFlux.reset: ' + name + ' not found on state');
      this.setStateScope(name, this.defaultState[name]);
      this.emit(this.constructor.getEventNames(name).reset);
    }
  }, {
    key: 'resetState',
    value: function resetState() {
      var names = Object.keys(this.defaultState);

      for (var i = names.length; i--;) {
        this.resetStateScope(names[i]);
      }
    }
  }, {
    key: 'plug',
    value: function plug(fn) {
      if (!isFn(fn)) throw new Error('ezFlux: plugin must be a function');
      Object.assign(this.plugins, fn.apply(this));
    }
  }]);

  return EZFlux;
}();

exports.default = EZFlux;