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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var colorMap = { error: 'red', action: 'cyan', change: 'green' };

var Flux = function (_EventEmitter) {
  _inherits(Flux, _EventEmitter);

  _createClass(Flux, null, [{
    key: 'cloneDeep',
    value: function cloneDeep(obj) {
      if (!obj || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') {
        return obj;
      }
      var i = 0;

      if (obj instanceof Array) {
        var arrClone = [];
        var _length = obj.length;


        for (; i < _length; i++) {
          arrClone[i] = this.cloneDeep(obj[i]);
        }
        return arrClone;
      }
      var objClone = {};
      var keys = Object.keys(obj);
      var length = keys.length;


      for (; i < length; i++) {
        var key = keys[i];

        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          objClone[key] = this.cloneDeep(obj[key]);
        }
      }
      return objClone;
    }
  }]);

  function Flux() {
    var stateCfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Flux);

    var _this = _possibleConstructorReturn(this, (Flux.__proto__ || Object.getPrototypeOf(Flux)).call(this));

    _this.history = {};
    _this.cfg = { debug: true, throttleUpdates: false };
    _this.runsInBrowser = typeof window !== 'undefined' && !!window.requestAnimationFrame;
    _this.actions = {};
    _this.updateBuffer = [];
    _this.updateTimeout = null;

    var appState = {};
    var scopeNames = Object.keys(stateCfg);
    var length = scopeNames.length;


    Object.defineProperty(_this, 'state', { get: function get() {
        return _this.constructor.cloneDeep(appState);
      } });
    if (cfg) _this.setConfig(cfg);

    for (var i = 0; i < length; i++) {
      var _stateCfg$scopeNames$ = stateCfg[scopeNames[i]],
          _actions = _stateCfg$scopeNames$.actions,
          _state = _stateCfg$scopeNames$.state;


      _this.addScopeToState(scopeNames[i], _state, _actions, appState);
    }
    return _this;
  }

  /**                                   State Configuration                                    */

  _createClass(Flux, [{
    key: 'addScopeToState',
    value: function addScopeToState(name, state, actions, appState) {
      var _this2 = this;

      if (!state || (typeof state === 'undefined' ? 'undefined' : _typeof(state)) !== 'object') {
        if (this.cfg.debug) console.error('ezFlux: "' + name + '" must include a state object'); // eslint-disable-line no-console
        return;
      }
      if (!actions || Object.keys(actions).find(function (key) {
        return typeof actions[key] !== 'function';
      })) {
        if (this.cfg.debug) console.error('ezFlux: "' + name + '" actions must include dictionary of functions'); // eslint-disable-line no-console
        return;
      }
      var actionNames = Object.keys(actions);
      var length = actionNames.length;


      appState[name] = this.constructor.cloneDeep(state); // eslint-disable-line no-param-reassign

      var _loop = function _loop(i) {
        var actionName = actionNames[i];
        var eventName = _this2.createActionTrigger(name, actionName);
        var action = actions[actionName];
        var setState = function setState(stateChange) {
          if (!stateChange || (typeof stateChange === 'undefined' ? 'undefined' : _typeof(stateChange)) !== 'object') {
            if (_this2.cfg.debug) console.error(name + '.' + actionName + ': setState argument must be Object'); // eslint-disable-line no-console
            return;
          }
          Object.assign(appState[name], stateChange);
          _this2.queueUpdate(name);
        };

        _this2.on(eventName, function (data) {
          action(data, _this2.state, setState);
        });
      };

      for (var i = 0; i < length; i++) {
        _loop(i);
      }
    }
  }, {
    key: 'createActionTrigger',
    value: function createActionTrigger(stateName, actionName) {
      var _this3 = this;

      var eventName = 'action.' + stateName + '.' + actionName;

      if (!this.actions[stateName]) this.actions[stateName] = {};
      this.actions[stateName][actionName] = function (data) {
        return _this3.emit(eventName, data);
      };

      return eventName;
    }

    /**                                   Event Handling                                    */

  }, {
    key: 'flushUpdates',
    value: function flushUpdates() {
      var key = this.updateBuffer.shift();
      if (!key) return;

      this.emit('state.change.' + key, this.state);
      this.flushUpdates();
    }
  }, {
    key: 'queueUpdate',
    value: function queueUpdate(key) {
      if (this.updateBuffer.indexOf(key) === -1) this.updateBuffer.push(key);
      if (this.runsInBrowser && this.cfg.throttleUpdates) {
        window.cancelAnimationFrame(this.updateTimeout);
        this.updateTimeout = window.requestAnimationFrame(this.flushUpdates);
      } else {
        this.flushUpdates();
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

      (_get2 = _get(Flux.prototype.__proto__ || Object.getPrototypeOf(Flux.prototype), 'emit', this)).call.apply(_get2, [this, name].concat(_toConsumableArray(args)));
      if (!this.cfg.debug) return;

      var state = this.state;
      var time = new Date().getTime();
      var msg = 'ezFlux | ' + time + ' ' + name;
      var color = colorMap[name.split('.')[0]] || 'gray';

      this.history[time + ' ' + msg] = { time: time, msg: msg, state: state };

      if (this.runsInBrowser) console.log('%c' + msg, 'color:' + color, { state: state }); // eslint-disable-line no-console
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

  return Flux;
}(_eventemitter2.default);

exports.default = Flux;