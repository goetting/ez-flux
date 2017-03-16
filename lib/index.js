'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var colorMap = { error: 'red', action: 'cyan', change: 'green' };
var nextId = 0;

var EZFlux = function (_EventEmitter) {
  _inherits(EZFlux, _EventEmitter);

  _createClass(EZFlux, null, [{
    key: 'cloneDeep',
    value: function cloneDeep(obj) {
      if (!obj || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') {
        return obj;
      }
      if (obj instanceof Array) {
        var arrClone = [];

        for (var i = obj.length; i--;) {
          arrClone[i] = this.cloneDeep(obj[i]);
        }
        return arrClone;
      }
      var objClone = {};
      var keys = Object.keys(obj);

      for (var _i = keys.length; _i--;) {
        var key = keys[_i];

        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          objClone[key] = this.cloneDeep(obj[key]);
        }
      }
      return objClone;
    }
  }, {
    key: 'isPromise',
    value: function isPromise(val) {
      return val && typeof val.then === 'function';
    }
  }, {
    key: 'generateUID',
    value: function generateUID() {
      return nextId++;
    }
  }, {
    key: 'getTriggerEventName',
    value: function getTriggerEventName(stateName, actionName) {
      return 'action.trigger.' + stateName + '.' + actionName;
    }
  }, {
    key: 'getChangeEventName',
    value: function getChangeEventName(stateName) {
      return 'state.change.' + stateName;
    }
  }]);

  function EZFlux() {
    var stateCfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, EZFlux);

    var _this = _possibleConstructorReturn(this, (EZFlux.__proto__ || Object.getPrototypeOf(EZFlux)).call(this));

    _this.history = {};
    _this.cfg = { debug: true, throttleUpdates: false };
    _this.runsInBrowser = typeof window !== 'undefined' && !!window.requestAnimationFrame;
    _this.actions = {};
    _this.eventBuffer = {};
    _this.emissionTimeout = null;

    var appState = {};
    var scopeNames = Object.keys(stateCfg);

    Object.defineProperty(_this, 'state', { get: function get() {
        return _this.constructor.cloneDeep(appState);
      } });
    if (cfg) _this.setConfig(cfg);

    for (var i = scopeNames.length; i--;) {
      var _stateCfg$scopeNames$ = stateCfg[scopeNames[i]],
          _actions = _stateCfg$scopeNames$.actions,
          _state = _stateCfg$scopeNames$.state;


      _this.addScopeToState(scopeNames[i], _state, _actions, appState);
    }
    return _this;
  }

  /**                                   State Configuration                                    */

  _createClass(EZFlux, [{
    key: 'addScopeToState',
    value: function addScopeToState(name, state, actions, appState) {
      var _this2 = this;

      if (!state || (typeof state === 'undefined' ? 'undefined' : _typeof(state)) !== 'object') {
        throw new Error('ezFlux: "' + name + '" must include a state object');
      }
      if (!actions || Object.keys(actions).find(function (key) {
        return typeof actions[key] !== 'function';
      })) {
        throw new Error('ezFlux: "' + name + '" actions must include dictionary of functions');
      }
      var actionNames = Object.keys(actions);

      appState[name] = this.constructor.cloneDeep(state); // eslint-disable-line no-param-reassign

      var _loop = function _loop(i) {
        var actionName = actionNames[i];
        var action = actions[actionName];
        var triggerEventName = _this2.createActionTrigger(name, actionName);
        var changeEventName = _this2.constructor.getChangeEventName(name);

        _this2.eventBuffer[changeEventName] = {};
        _this2.on(triggerEventName, function (data, id) {
          var actionRes = action(data, _this2);
          var setState = function setState(stateChange) {
            if (!stateChange || (typeof stateChange === 'undefined' ? 'undefined' : _typeof(stateChange)) !== 'object') {
              throw new Error('ezFlux: "' + name + '.' + actionName + '": action did not return an Object.');
            }
            Object.assign(appState[name], stateChange);
            _this2.emitOrBuffer(changeEventName, id);
          };
          if (_this2.constructor.isPromise(actionRes)) actionRes.then(setState);else setState(actionRes);
        });
      };

      for (var i = actionNames.length; i--;) {
        _loop(i);
      }
    }
  }, {
    key: 'createActionTrigger',
    value: function createActionTrigger(stateName, actionName) {
      var _this3 = this;

      var triggerEventName = this.constructor.getTriggerEventName(stateName, actionName);
      var changeEventName = this.constructor.getChangeEventName(stateName);

      if (!this.actions[stateName]) this.actions[stateName] = {};

      this.actions[stateName][actionName] = function (data) {
        return new Promise(function (res) {
          var id = _this3.constructor.generateUID();
          var eventHandler = function eventHandler(idDictionary) {
            if (!idDictionary[id]) return;
            _this3.removeListener(changeEventName, eventHandler);
            res();
          };
          _this3.on(changeEventName, eventHandler);
          _this3.emit(triggerEventName, data, id);
        });
      };
      return triggerEventName;
    }

    /**                                   Event Handling                                    */

  }, {
    key: 'emitOrBuffer',
    value: function emitOrBuffer(eventName, id) {
      if (!this.runsInBrowser || !this.cfg.throttleUpdates) {
        this.emit(eventName, _defineProperty({}, id, 1));
        return;
      }
      this.eventBuffer[eventName][id] = 1;
      window.cancelAnimationFrame(this.emissionTimeout);
      this.emissionTimeout = window.requestAnimationFrame(this.emitBuffered);
    }
  }, {
    key: 'emitBuffered',
    value: function emitBuffered() {
      var names = Object.keys(this.eventBuffer);

      for (var i = names.length; i--;) {
        var ids = this.eventBuffer[names[i]];

        this.emit(names[i], ids);
      }
    }
  }, {
    key: 'emit',
    value: function emit() {
      var _get2;

      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      (_get2 = _get(EZFlux.prototype.__proto__ || Object.getPrototypeOf(EZFlux.prototype), 'emit', this)).call.apply(_get2, [this, name].concat(_toConsumableArray(args)));
      if (!this.cfg.debug) return;

      var state = this.state;
      var time = new Date().getTime();
      var msg = 'ezFlux | ' + time + ' ' + name;
      var color = colorMap[name.split('.')[0]] || 'gray';

      this.history[time + ' ' + msg] = { time: time, msg: msg, state: state };

      if (this.runsInBrowser) console.log('%c' + msg, 'color:' + color, { state: state }); // eslint-disable-line no-console
      else console.log(msg, { state: state }); // eslint-disable-line no-console
    }

    /**                                   Config                                    */

  }, {
    key: 'getConfig',
    value: function getConfig() {
      return Object.assign({}, this.cfg);
    }
  }, {
    key: 'setConfig',
    value: function setConfig() {
      var cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (typeof cfg.throttleUpdates === 'boolean') this.cfg.throttleUpdates = cfg.throttleUpdates;
      if (typeof cfg.debug === 'boolean') this.cfg.debug = cfg.debug;
    }
  }]);

  return EZFlux;
}(_eventemitter2.default);

exports.default = EZFlux;