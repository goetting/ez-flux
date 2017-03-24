'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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

var colorMap = { error: 'red', trigger: 'cyan', change: 'green' };
var nextId = 0;

var EZFlux = function (_EventEmitter) {
  _inherits(EZFlux, _EventEmitter);

  _createClass(EZFlux, null, [{
    key: 'cloneDeep',
    value: function cloneDeep(val) {
      if (!val || (typeof val === 'undefined' ? 'undefined' : _typeof(val)) !== 'object') {
        return val;
      }
      if (val instanceof Array) {
        var arrClone = [];

        for (var i = val.length; i--;) {
          arrClone[i] = this.cloneDeep(val[i]);
        }
        return arrClone;
      }
      var objClone = {};
      var keys = Object.keys(val);

      for (var _i = keys.length; _i--;) {
        var key = keys[_i];

        if (Object.prototype.hasOwnProperty.call(val, key)) {
          objClone[key] = this.cloneDeep(val[key]);
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
      return 'trigger:action.' + stateName + '.' + actionName;
    }
  }, {
    key: 'getCanceledEventName',
    value: function getCanceledEventName(stateName, actionName) {
      return 'aborted:action.' + stateName + '.' + actionName;
    }
  }, {
    key: 'getChangeEventName',
    value: function getChangeEventName(stateName) {
      return 'change:state.' + stateName;
    }
  }, {
    key: 'validateScope',
    value: function validateScope(name, values, actions) {
      if (!values || (typeof values === 'undefined' ? 'undefined' : _typeof(values)) !== 'object') {
        throw new Error('ezFlux: "' + name + '" must include a values object');
      }
      if (!actions || Object.keys(actions).find(function (key) {
        return typeof actions[key] !== 'function';
      })) {
        throw new Error('ezFlux: "' + name + '" actions must include dictionary of functions');
      }
    }
  }]);

  function EZFlux() {
    var stateCfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, EZFlux);

    var _this = _possibleConstructorReturn(this, (EZFlux.__proto__ || Object.getPrototypeOf(EZFlux)).call(this));

    _initialiseProps.call(_this);

    var state = {};
    var scopeNames = Object.keys(stateCfg);
    var initState = options.initialState || {};
    var clone = _this.constructor.cloneDeep.bind(_this.constructor);

    Object.defineProperty(_this, 'state', { get: function get() {
        return clone(state);
      } });
    _this.setConfig(options);

    for (var i = scopeNames.length; i--;) {
      var _name = scopeNames[i];
      var _stateCfg$_name = stateCfg[_name],
          _actions = _stateCfg$_name.actions,
          _values = _stateCfg$_name.values;


      _this.constructor.validateScope(_name, _values, _actions);
      state[_name] = clone(_values);
      if (initState[_name]) Object.assign(state[_name], initState[_name]);
      _this.addScopeToEventSystem(_name, _actions, state);
    }
    var defaultState = clone(state);

    _this.resetState = function () {
      state = clone(defaultState);
    };
    return _this;
  }

  /*                                   Event Setup                                    */

  _createClass(EZFlux, [{
    key: 'addScopeToEventSystem',
    value: function addScopeToEventSystem(name, actions, state) {
      var _this2 = this;

      var actionNames = Object.keys(actions);

      var _loop = function _loop(i) {
        var actionName = actionNames[i];
        var action = actions[actionName];
        var triggerEventName = _this2.createActionTrigger(name, actionName);
        var changeEventName = _this2.constructor.getChangeEventName(name);
        var canceledEventName = _this2.constructor.getCanceledEventName(name, actionName);

        _this2.on(triggerEventName, function (id, data) {
          var actionRes = action(data, _this2);
          var setState = function setState(stateChange) {
            if (!stateChange) {
              _this2.emitOrBuffer(canceledEventName, id);
              return;
            }
            if ((typeof stateChange === 'undefined' ? 'undefined' : _typeof(stateChange)) !== 'object') {
              throw new Error('ezFlux: "' + name + '.' + actionName + '": must return falsy value or Object.');
            }
            Object.assign(state[name], stateChange);
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

      var canceledEventName = this.constructor.getCanceledEventName(stateName, actionName);
      var triggerEventName = this.constructor.getTriggerEventName(stateName, actionName);
      var changeEventName = this.constructor.getChangeEventName(stateName);

      if (!this.actions[stateName]) this.actions[stateName] = {};

      this.actions[stateName][actionName] = function (data) {
        return new Promise(function (res) {
          var id = _this3.constructor.generateUID();
          var eventHandler = function eventHandler(idDictionary) {
            if (!idDictionary[id]) return;
            _this3.removeListener(changeEventName, eventHandler);
            _this3.removeListener(canceledEventName, eventHandler);
            res();
          };
          _this3.on(changeEventName, eventHandler);
          _this3.on(canceledEventName, eventHandler);
          _this3.emit(triggerEventName, id, data);
        });
      };
      return triggerEventName;
    }

    /*                                   Event Handling                                    */

  }, {
    key: 'emitOrBuffer',
    value: function emitOrBuffer(eventName, id) {
      var _this4 = this;

      if (!this.runsInBrowser || !this.cfg.throttleUpdates) {
        this.emit(eventName, _defineProperty({}, id, 1));
        return;
      }
      if (!this.eventBuffer[eventName]) this.eventBuffer[eventName] = {};

      this.eventBuffer[eventName][id] = 1;
      window.cancelAnimationFrame(this.emissionTimeout);

      this.emissionTimeout = window.requestAnimationFrame(function () {
        var names = Object.keys(_this4.eventBuffer);

        for (var i = names.length; i--;) {
          var ids = _this4.eventBuffer[names[i]];

          _this4.emit(names[i], ids);
          delete _this4.eventBuffer[names[i]];
        }
      });
    }
  }, {
    key: 'emit',
    value: function emit() {
      var _get2;

      var eventName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      (_get2 = _get(EZFlux.prototype.__proto__ || Object.getPrototypeOf(EZFlux.prototype), 'emit', this)).call.apply(_get2, [this, eventName].concat(_toConsumableArray(args)));
      if (!this.cfg.debug) return;

      var state = this.state;
      var time = Date.now();
      var msg = 'ezFlux | ' + eventName;
      var color = colorMap[eventName.split(':')[0]] || 'gray';

      var _args = _slicedToArray(args, 2),
          id = _args[0],
          actionPayload = _args[1];

      this.history[time] = { time: time, eventName: eventName, state: state, id: id, actionPayload: actionPayload };

      if (this.runsInBrowser) console.log('%c' + msg, 'color:' + color, this.history[time]); // eslint-disable-line no-console
      else console.log(msg, this.history[time]); // eslint-disable-line no-console
    }

    /*                                   Config                                    */

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

var _initialiseProps = function _initialiseProps() {
  this.history = {};
  this.cfg = { debug: false, throttleUpdates: false };
  this.runsInBrowser = typeof window !== 'undefined' && !!window.requestAnimationFrame;
  this.actions = {};
  this.eventBuffer = {};
  this.emissionTimeout = null;
};

exports.default = EZFlux;