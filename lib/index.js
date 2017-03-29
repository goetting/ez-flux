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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var colorMap = { RESET: 'red', trigger: 'cyan', change: 'green' };
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
    key: 'getResetEventName',
    value: function getResetEventName() {
      return 'RESET';
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
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { log: {} };

    _classCallCheck(this, EZFlux);

    var _this = _possibleConstructorReturn(this, (EZFlux.__proto__ || Object.getPrototypeOf(EZFlux)).call(this));

    _this.history = {};
    _this.cfg = { throttleUpdates: false, log: { events: false, history: false, trace: false } };
    _this.runsInBrowser = typeof window !== 'undefined' && !!window.requestAnimationFrame;
    _this.actions = {};
    _this.eventBuffer = {};
    _this.emissionTimeout = null;

    var state = {};
    var defaultState = {};
    var scopeNames = Object.keys(stateCfg);
    var initState = options.initialState || {};
    var clone = _this.constructor.cloneDeep.bind(_this.constructor);

    Object.defineProperty(_this, 'state', { get: function get() {
        return clone(state);
      } });
    _this.setConfig(options);

    for (var i = scopeNames.length; i--;) {
      var _name = scopeNames[i];
      var scopeConfig = stateCfg[_name];

      _this.constructor.validateScope(_name, stateCfg[_name]);
      state[_name] = clone(scopeConfig.values);
      if (initState[_name]) Object.assign(state[_name], initState[_name]);
      _this.addScopeToEventSystem(state, _name, scopeConfig);
    }

    defaultState = clone(state);
    _this.resetState = function () {
      _this.emit(_this.constructor.getResetEventName());

      state = clone(defaultState);
    };
    return _this;
  }

  /*                                   Event Setup                                    */

  _createClass(EZFlux, [{
    key: 'addScopeToEventSystem',
    value: function addScopeToEventSystem(state, name, scopeConfig) {
      var actionNames = Object.keys(scopeConfig.actions);
      var beforeActions = scopeConfig.beforeActions,
          afterActions = scopeConfig.afterActions,
          actions = scopeConfig.actions;


      for (var i = actionNames.length; i--;) {
        var _actionName = actionNames[i];
        var action = actions[_actionName].bind(this);

        this.addActionTrigger(name, _actionName);
        this.addActionTriggerListener(state, name, _actionName, action, beforeActions, afterActions);
      }
    }
  }, {
    key: 'addActionTriggerListener',
    value: function addActionTriggerListener(state, scopeName, actionName, action, beforeActions, afterActions) {
      var _this2 = this;

      var triggerEventName = this.constructor.getTriggerEventName(scopeName, actionName);
      var changeEventName = this.constructor.getChangeEventName(scopeName);
      var canceledEventName = this.constructor.getCanceledEventName(scopeName, actionName);
      var actionFlow = [action];

      if (beforeActions) actionFlow.push(beforeActions.bind(this));
      if (afterActions) actionFlow.unshift(afterActions.bind(this));

      this.on(triggerEventName, function () {
        var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(id, payload) {
          var stateChange, callAndCheck, success, i;
          return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  stateChange = _this2.constructor.cloneDeep(state[scopeName]);

                  callAndCheck = function () {
                    var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(method) {
                      var actionResult, isValidResult;
                      return regeneratorRuntime.wrap(function _callee$(_context) {
                        while (1) {
                          switch (_context.prev = _context.next) {
                            case 0:
                              _context.next = 2;
                              return method(payload, stateChange, actionName, _this2);

                            case 2:
                              actionResult = _context.sent;
                              isValidResult = actionResult && (typeof actionResult === 'undefined' ? 'undefined' : _typeof(actionResult)) === 'object';


                              if (isValidResult) Object.assign(stateChange, actionResult);
                              return _context.abrupt('return', isValidResult);

                            case 6:
                            case 'end':
                              return _context.stop();
                          }
                        }
                      }, _callee, _this2);
                    }));

                    return function callAndCheck(_x5) {
                      return _ref3.apply(this, arguments);
                    };
                  }();

                  success = true;
                  i = actionFlow.length;

                case 4:
                  if (!(i-- && success)) {
                    _context2.next = 10;
                    break;
                  }

                  _context2.next = 7;
                  return callAndCheck(actionFlow[i]);

                case 7:
                  success = _context2.sent;

                case 8:
                  _context2.next = 4;
                  break;

                case 10:
                  if (success) {
                    Object.assign(state[scopeName], stateChange);
                    _this2.emitOrBuffer(changeEventName, id);
                  } else {
                    _this2.emitOrBuffer(canceledEventName, id);
                  }

                case 11:
                case 'end':
                  return _context2.stop();
              }
            }
          }, _callee2, _this2);
        }));

        return function (_x3, _x4) {
          return _ref2.apply(this, arguments);
        };
      }());
    }
  }, {
    key: 'addActionTrigger',
    value: function addActionTrigger(scopeName, actionName) {
      var _this3 = this;

      var canceledEventName = this.constructor.getCanceledEventName(scopeName, actionName);
      var triggerEventName = this.constructor.getTriggerEventName(scopeName, actionName);
      var changeEventName = this.constructor.getChangeEventName(scopeName);

      if (!this.actions[scopeName]) this.actions[scopeName] = {};

      this.actions[scopeName][actionName] = function (data) {
        return new Promise(function (res) {
          var id = _this3.constructor.generateUID();
          var eventHandler = function eventHandler(ids) {
            if (!ids[id]) return;
            _this3.removeListener(changeEventName, eventHandler);
            _this3.removeListener(canceledEventName, eventHandler);
            res();
          };
          _this3.on(changeEventName, eventHandler);
          _this3.on(canceledEventName, eventHandler);
          _this3.emit(triggerEventName, id, data);
        });
      };
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
      if (!this.eventBuffer[eventName]) this.eventBuffer[eventName] = _defineProperty({}, id, 1);
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
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      var _console;

      var id = arguments[1];
      var payload = arguments[2];

      _get(EZFlux.prototype.__proto__ || Object.getPrototypeOf(EZFlux.prototype), 'emit', this).call(this, name, id, payload);
      if (!this.cfg.log.events && !this.cfg.log.history) return;

      var time = Date.now();
      var msg = 'ezFlux | ' + name;
      var color = colorMap[name.split(':')[0]] || 'gray';
      var log = [];

      this.history[time] = { time: time, name: name, id: id, state: this.state };
      if (payload) this.history[time].payload = payload;

      if (this.cfg.log.events) log = this.runsInBrowser ? ['%c' + msg, 'color:' + color] : [msg];
      if (this.cfg.log.history) log.push(this.history[time]);

      (_console = console)[this.cfg.log.trace ? 'trace' : 'log'].apply(_console, _toConsumableArray(log)); // eslint-disable-line no-console
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
      var cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { log: {} };

      if (typeof cfg.throttleUpdates === 'boolean') this.cfg.throttleUpdates = cfg.throttleUpdates;
      if (_typeof(cfg.log) === 'object') Object.assign(this.cfg.log, cfg.log);
    }
  }]);

  return EZFlux;
}(_eventemitter2.default);

exports.default = EZFlux;