'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var colorMap = { RESET: 'red', trigger: 'cyan', change: 'green' };

var EZFlux = function (_EventEmitter) {
  _inherits(EZFlux, _EventEmitter);

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
        throw new Error('ezFlux: "' + name + '" must include a values object');
      }
      if (!actions || Object.keys(actions).find(function (key) {
        return typeof actions[key] !== 'function';
      })) {
        throw new Error('ezFlux: "' + name + '" actions must include dictionary of functions');
      }
      if (afterActions && typeof afterActions !== 'function') {
        throw new Error('ezFlux: "' + name + '" \'afterActions\' must be a function or undefined');
      }
      if (beforeActions && typeof beforeActions !== 'function') {
        throw new Error('ezFlux: "' + name + '" \'beforeActions\' must be a function or undefined');
      }
    }
  }]);

  function EZFlux() {
    var stateCfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { history: {} };

    _classCallCheck(this, EZFlux);

    var _this = _possibleConstructorReturn(this, (EZFlux.__proto__ || Object.getPrototypeOf(EZFlux)).call(this));

    _this.history = {};
    _this.cfg = { throttleUpdates: false, history: { log: false, record: false } };
    _this.runsInBrowser = typeof window !== 'undefined' && !!window.requestAnimationFrame;
    _this.actions = {};
    _this.eventBuffer = {};
    _this.emissionTimeout = null;
    _this.defaultState = {};
    _this.state = {};

    var scopeNames = Object.keys(stateCfg);
    var initState = options.initialState || {};

    _this.setConfig(options);

    for (var i = scopeNames.length; i--;) {
      var _name = scopeNames[i];
      var scopeConfig = stateCfg[_name];

      _this.constructor.validateScope(_name, scopeConfig);

      _this.state[_name] = _extends({}, scopeConfig.values);
      _this.defaultState[_name] = _extends({}, scopeConfig.values);
      if (initState[_name]) Object.assign(_this.state[_name], initState[_name]);
      Object.freeze(_this.state[_name]);

      _this.addScopeToEventSystem(_name, scopeConfig);
    }
    Object.freeze(_this.state);
    return _this;
  }

  /*                                   Event Setup                                    */

  _createClass(EZFlux, [{
    key: 'addScopeToEventSystem',
    value: function addScopeToEventSystem(scopeName, scopeConfig) {
      var _this2 = this;

      var actionNames = Object.keys(scopeConfig.actions);
      var beforeActions = scopeConfig.beforeActions,
          afterActions = scopeConfig.afterActions,
          actions = scopeConfig.actions;


      this.actions[scopeName] = {};

      var _loop = function _loop(i) {
        var actionName = actionNames[i];
        var eventNames = _this2.constructor.getEventNames(scopeName, actionName);
        var action = actions[actionName];
        var actionCycle = _this2.constructor.getActionCycle(action, beforeActions, afterActions);
        var listener = _this2.getActionListener(scopeName, actionName, actionCycle, eventNames);
        var trigger = function trigger(payload) {
          return new Promise(function (res) {
            return _this2.emit(eventNames.triggered, payload, res);
          });
        }; // eslint-disable-line no-loop-func

        _this2.actions[scopeName][actionName] = trigger;
        _this2.on(eventNames.triggered, listener);
      };

      for (var i = actionNames.length; i--;) {
        _loop(i);
      }
    }
  }, {
    key: 'getActionListener',
    value: function getActionListener(scopeName, actionName, actionCycle, eventNames) {
      var _this3 = this;

      return function (payload, res) {
        var stateChange = Object.seal(_extends({}, _this3.state[scopeName]));
        var runSeries = function runSeries(actions, cb) {
          var result = actions[0](payload, stateChange, _this3, actionName);
          var validateActionResult = function validateActionResult(actionResult) {
            if (!actionResult || (typeof actionResult === 'undefined' ? 'undefined' : _typeof(actionResult)) !== 'object') {
              cb(false);
              return;
            }
            Object.assign(stateChange, actionResult);
            actions.shift();

            if (actions.length) runSeries(actions, cb);else cb(true);
          };

          if (!result || !result.then) validateActionResult(result);else result.then(validateActionResult);
        };

        runSeries(actionCycle.reverse(), function (success) {
          if (success) {
            _this3.state = _extends({}, _this3.state);
            _this3.state[scopeName] = _extends({}, stateChange);
            Object.freeze(_this3.state);
            Object.freeze(_this3.state[scopeName]);
            _this3.emitOrBuffer(eventNames.change, null, res);
          } else {
            _this3.emitOrBuffer(eventNames.canceled, null, res);
          }
        });
      };
    }

    /*                                   Event Handling                                    */

  }, {
    key: 'emitOrBuffer',
    value: function emitOrBuffer(eventName, payload, triggerResolver) {
      var _this4 = this;

      if (!this.runsInBrowser || !this.cfg.throttleUpdates) {
        this.emit(eventName);
        if (triggerResolver) triggerResolver();
        return;
      }
      if (!this.eventBuffer[eventName]) this.eventBuffer[eventName] = [];
      if (triggerResolver) this.eventBuffer[eventName].push(triggerResolver);

      window.cancelAnimationFrame(this.emissionTimeout);

      this.emissionTimeout = window.requestAnimationFrame(function () {
        var names = Object.keys(_this4.eventBuffer);

        for (var i = names.length; i--;) {
          _this4.eventBuffer[names[i]].forEach(function (res) {
            return res();
          });
          _this4.emit(names[i]);
          delete _this4.eventBuffer[names[i]];
        }
      });
    }
  }, {
    key: 'emit',
    value: function emit() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var payload = arguments[1];
      var triggerResolver = arguments[2];

      _get(EZFlux.prototype.__proto__ || Object.getPrototypeOf(EZFlux.prototype), 'emit', this).call(this, name, payload, triggerResolver);
      if (!this.cfg.console || !console[this.cfg.console]) return; // eslint-disable-line no-console

      var logger = console[this.cfg.console]; // eslint-disable-line no-console
      var time = Date.now();
      var msg = 'ezFlux | ' + name;
      var color = colorMap[name.split(':')[0]] || 'gray';
      var log = this.runsInBrowser ? ['%c' + msg, 'color:' + color] : [msg];

      if (this.cfg.history.record) {
        var copy = {};
        var scopes = Object.keys(this.state);

        for (var i = scopes.length; i--;) {
          copy[scopes[i]] = _extends({}, this.state[scopes[i]]);
        }this.history[time] = { time: time, name: name, state: copy };
        if (payload) this.history[time].payload = payload;
        if (this.cfg.history.log) log.push(this.history[time]);
      }

      logger.apply(undefined, log);
    }

    /*                                   Config                                    */

  }, {
    key: 'getConfig',
    value: function getConfig() {
      return Object.assign({}, this.cfg);
    }
  }, {
    key: 'setConfig',
    value: function setConfig(cfg) {
      if (typeof cfg.throttleUpdates === 'boolean') this.cfg.throttleUpdates = cfg.throttleUpdates;
      if (typeof cfg.console === 'string') this.cfg.console = cfg.console;
      if (_typeof(cfg.history) === 'object') Object.assign(this.cfg.history, cfg.history);
    }

    /*                                   reset                                    */

  }, {
    key: 'resetStateScope',
    value: function resetStateScope(name) {
      if (!this.defaultState[name]) throw new Error('ezFlux.reset: ' + name + ' not found on state');

      this.state = _extends({}, this.state, _defineProperty({}, name, _extends({}, this.defaultState[name])));
      Object.freeze(this.state[name]);
      this.emit(this.constructor.getEventNames(name).reset);
    }
  }, {
    key: 'resetState',
    value: function resetState() {
      var names = Object.keys(this.defaultState);

      this.state = {};
      for (var i = names.length; i--;) {
        this.resetStateScope(names[i]);
      }Object.freeze(this.state);
    }
  }]);

  return EZFlux;
}(_eventemitter2.default);

exports.default = EZFlux;