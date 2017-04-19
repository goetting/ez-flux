'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _minimitter = require('./minimitter');

var _minimitter2 = _interopRequireDefault(_minimitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var isFn = function isFn(fn) {
  return typeof fn === 'function';
};

var EZFlux = function (_MiniMitter) {
  _inherits(EZFlux, _MiniMitter);

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

    var _this = _possibleConstructorReturn(this, (EZFlux.__proto__ || Object.getPrototypeOf(EZFlux)).call(this));

    _this.history = {};
    _this.config = {};
    _this.actions = {};
    _this.defaultState = {};
    _this.state = {};
    _this.plugins = {};

    var scopeNames = Object.keys(stateCfg);
    var initState = options.initialState || {};

    _this.config = options;

    for (var i = scopeNames.length; i--;) {
      var _name = scopeNames[i];
      var scopeConfig = stateCfg[_name];

      _this.constructor.validateScope(_name, scopeConfig);
      _this.addScopeToState(_name, scopeConfig.values, initState[_name]);
      _this.addScopeToEventSystem(_name, scopeConfig);
    }
    Object.freeze(_this.state);

    if (options.plugins) {
      for (var _i = options.plugins.length; _i--;) {
        _this.plug(options.plugins[_i]);
      }delete _this.config.plugins;
    }
    return _this;
  }

  _createClass(EZFlux, [{
    key: 'addScopeToState',
    value: function addScopeToState(name, values) {
      var initValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var keys = Object.keys(values);

      this.state[name] = {};
      for (var i = keys.length; i--;) {
        var key = keys[i];
        var val = values[key];

        if (!isFn(val)) this.state[name][key] = initValues[key] || val;else Object.defineProperty(this.state[name], key, { enumerable: true, get: val.bind(this) });
      }
      this.defaultState[name] = Object.freeze(this.state[name]);
    }
  }, {
    key: 'addScopeToEventSystem',
    value: function addScopeToEventSystem(scopeName, scopeConfig) {
      var beforeActions = scopeConfig.beforeActions,
          afterActions = scopeConfig.afterActions,
          actions = scopeConfig.actions;

      var actionNames = Object.keys(actions);

      this.actions[scopeName] = {};

      for (var i = actionNames.length; i--;) {
        var _actionName = actionNames[i];
        var eventNames = this.constructor.getEventNames(scopeName, _actionName);
        var action = actions[_actionName];
        var actionCycle = this.constructor.getActionCycle(action, beforeActions, afterActions);
        var listener = this.getActionListener(scopeName, _actionName, actionCycle, eventNames);
        var trigger = this.getActionTrigger(eventNames);

        this.actions[scopeName][_actionName] = trigger;
        this.on(eventNames.triggered, listener);
      }
    }
  }, {
    key: 'getActionTrigger',
    value: function getActionTrigger(eventNames) {
      var _this2 = this;

      return function (payload) {
        return new Promise(function (res, rej) {
          return _this2.fluxEmit(eventNames.triggered, payload, res, rej);
        });
      };
    }
  }, {
    key: 'getActionListener',
    value: function getActionListener(scopeName, actionName, actionCycle, eventNames) {
      var _this3 = this;

      return function (payload, res, rej) {
        var i = actionCycle.length - 1;
        var stateChange = Object.seal(_extends({}, _this3.state[scopeName]));
        var runSeries = function runSeries(actions, cb) {
          var result = actions[i](payload, stateChange, _this3, actionName);
          var validateActionResult = function validateActionResult(actionResult) {
            if (!actionResult || (typeof actionResult === 'undefined' ? 'undefined' : _typeof(actionResult)) !== 'object') {
              cb(false);
              return;
            }
            try {
              Object.assign(stateChange, actionResult);
              i -= 1;
              if (actions[i]) runSeries(actions, cb);else cb(true);
            } catch (err) {
              rej(err);
            }
          };

          if (!result || !result.then) validateActionResult(result);else result.then(validateActionResult).catch(rej);
        };

        runSeries(actionCycle, function (success) {
          if (success) {
            _this3.setStateScope(scopeName, stateChange, eventNames.change);
            res(stateChange);
          } else {
            _this3.fluxEmit(eventNames.canceled);
            res();
          }
        });
      };
    }
  }, {
    key: 'setStateScope',
    value: function setStateScope(name, newState, eventName) {
      this.state = _extends({}, this.state);
      this.state[name] = _extends({}, newState);
      Object.freeze(this.state);
      Object.freeze(this.state[name]);
      this.fluxEmit(eventName);
    }
  }, {
    key: 'fluxEmit',
    value: function fluxEmit() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var payload = arguments[1];
      var res = arguments[2];
      var rej = arguments[3];

      this.emit(name, payload, res, rej);

      if (this.config.recordHistory) {
        var _time = Date.now();
        var _state = {};
        var scopes = Object.keys(this.state);

        for (var i = scopes.length; i--;) {
          _state[scopes[i]] = _extends({}, this.state[scopes[i]]);
        }this.history[_time] = { time: _time, name: name, state: _state, payload: payload };
      }
      if (this.config.onFluxEmit) {
        this.config.onFluxEmit(name, payload, this);
      }
      return this;
    }
  }, {
    key: 'resetStateScope',
    value: function resetStateScope(name) {
      if (!this.defaultState[name]) throw new Error('ezFlux.reset: ' + name + ' not found on state');
      this.setStateScope(name, this.defaultState[name], this.constructor.getEventNames(name).reset);
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
}(_minimitter2.default);

exports.default = EZFlux;