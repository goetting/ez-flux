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
var stateTypeDefaults = {
  undefined: undefined,
  object: null,
  boolean: false,
  number: 0,
  string: '',
  symbol: Symbol('I really wanted to have something falsy here'),
  function: function _function() {
    for (var _len = arguments.length, unsatisfyinglyUnfalsy = Array(_len), _key = 0; _key < _len; _key++) {
      unsatisfyinglyUnfalsy[_key] = arguments[_key];
    }

    return unsatisfyinglyUnfalsy;
  }
};
var validStateTypes = {
  undefined: false,
  object: true,
  boolean: true,
  number: true,
  string: true,
  symbol: true,
  function: false
};

var Flux = function () {
  _createClass(Flux, null, [{
    key: 'areStateTypesValid',
    value: function areStateTypesValid(stateTypes) {
      return Object.keys(stateTypes).findIndex(function (type) {
        return !validStateTypes[stateTypes[type]];
      }) === -1;
    }
  }, {
    key: 'stateAndStateTypesMatch',
    value: function stateAndStateTypesMatch() {
      var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var stateTypes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return Object.keys(state).findIndex(function (key) {
        return stateTypes[key] !== _typeof(state[key]);
      }) === -1;
    }
  }, {
    key: 'createStoreStateTypes',
    value: function createStoreStateTypes(state) {
      var stateTypes = {};
      Object.keys(state).forEach(function (key) {
        stateTypes[key] = _typeof(state[key]);
      });
      return stateTypes;
    }
  }, {
    key: 'createStoreState',
    value: function createStoreState(stateTypes) {
      var state = {};
      Object.keys(stateTypes).forEach(function (key) {
        state[key] = stateTypeDefaults[stateTypes[key]];
      });
      return state;
    }
  }]);

  function Flux() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var storeConfigs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var logger = arguments[2];

    _classCallCheck(this, Flux);

    this.config = config;
    this.logger = logger;

    this.bus = new _eventemitter2.default();
    this.appState = {};
    this.defaultAppState = {};
    this.stores = {};
    this.actions = {};

    this.dispatchBuffer = [];
    this.updateBuffer = [];
    this.isDispatching = false;
    this.updateTimeout = null;

    this.bus.setMaxListeners(config.maxListeners);
    this.bus.history = {};
    this.createStores(storeConfigs);
  }

  /**
                              Store Creation
  */

  _createClass(Flux, [{
    key: 'createStores',
    value: function createStores(storeConfigs) {
      var _this = this;

      Object.keys(storeConfigs).forEach(function (name) {
        return _this.createStore(name, storeConfigs[name]);
      });
    }
  }, {
    key: 'createStore',
    value: function createStore(name, storeConfigParam) {
      var storeConfig = this.validateStoreData(name, storeConfigParam);

      if (storeConfig.isValid) {
        this.integrateStoreData(storeConfig);
        this.integrateReactions(storeConfig);
      }
    }
  }, {
    key: 'validateStoreData',
    value: function validateStoreData(name) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          state = _ref.state,
          stateTypes = _ref.stateTypes,
          reactions = _ref.reactions;

      var res = {
        name: name,
        state: state || {},
        stateTypes: stateTypes || {},
        reactions: reactions,
        isValid: false
      };

      if (!reactions || !state && !stateTypes) {
        this.logger.error(name + ' store: Must have reactions and state or stateTypes');
        return res;
      }
      if (Object.keys(reactions).findIndex(function (key) {
        return typeof reactions[key] !== 'function';
      }) > -1) {
        this.logger.error(name + ' store: reactions must be a dictionary of functions');
        return res;
      }
      if (!stateTypes && state) {
        res.stateTypes = this.constructor.createStoreStateTypes(state);
      }
      if (!this.constructor.areStateTypesValid(res.stateTypes)) {
        this.logger.error(name + ' store: state has invalid type. do not use undefined or function');
        return res;
      }
      if (state) {
        if (!this.constructor.stateAndStateTypesMatch(state, res.stateTypes)) {
          this.logger.error(name + ' store: stateTypes did not match typeof state values.');
          return res;
        }
      } else {
        res.state = this.constructor.createStoreState(res.stateTypes);
      }
      res.isValid = true;
      return res;
    }
  }, {
    key: 'integrateStoreData',
    value: function integrateStoreData(_ref2) {
      var _this2 = this;

      var name = _ref2.name,
          state = _ref2.state,
          stateTypes = _ref2.stateTypes,
          reactions = _ref2.reactions;

      var getState = function getState() {
        return Object.assign({}, _this2.appState[name]);
      };

      this.appState[name] = Object.assign({}, state);
      this.defaultAppState[name] = Object.assign({}, state);
      this.stores[name] = { reactions: reactions, stateTypes: stateTypes, getState: getState };
    }
  }, {
    key: 'integrateReactions',
    value: function integrateReactions(_ref3) {
      var _this3 = this;

      var name = _ref3.name,
          state = _ref3.state,
          stateTypes = _ref3.stateTypes,
          reactions = _ref3.reactions;

      Object.keys(reactions).forEach(function (reactionName) {
        var evName = _this3.createAction(name, reactionName);

        _this3.bus.on(evName, function (data) {
          var newState = _this3.dispatch(reactions[reactionName], data, name);
          var newStateIsValid = Object.keys(newState).findIndex(function (key) {
            var isInValid = !state[key] || _typeof(newState[key]) !== stateTypes[key];
            if (isInValid) {
              _this3.logger.error(name + '.reactions.' + reactionName + ':' + ('stateKey ' + key + ' had value ' + newState[key] + ' but should be type ' + stateTypes[key]));
            }
            return isInValid;
          }) > -1;

          if (newStateIsValid) {
            Object.assign(_this3.appState[name], state);
            _this3.queueUpdate(name);
          }
        });
      });
    }
  }, {
    key: 'createAction',
    value: function createAction(store, actionName) {
      var _this4 = this;

      var evName = 'action.' + store + '.' + actionName;

      this.actions[store] = this.actions[store] || {};
      this.actions[store][actionName] = function (data) {
        if (_this4.config.bufferActions && _this4.isDispatching) {
          _this4.dispatchBuffer.push({ evName: evName, data: data });
        } else {
          _this4.bus.emit(evName, data || {});
        }
      };

      return evName;
    }

    /**
                                Event Handling
    */

  }, {
    key: 'flushDispatchBuffer',
    value: function flushDispatchBuffer() {
      var toDispatch = this.dispatchBuffer.shift();

      if (!toDispatch) return;

      var evName = toDispatch.evName,
          data = toDispatch.data;

      this.emit(evName, data);
      this.flushDispatchBuffer();
    }
  }, {
    key: 'dispatch',
    value: function dispatch(reaction, data, storeName) {
      this.isDispatching = true;
      var newState = reaction(data, this.appState[storeName]);
      this.isDispatching = false;
      this.flushDispatchBuffer();
      if (!(typeof newState === 'undefined' ? 'undefined' : _typeof(newState)) === 'object' || !Object.keys(newState).length) {
        this.logger.error('reaction of ' + storeName + ' store did not return an object ot change state');
        return this.appState[storeName];
      }
      return newState;
    }
  }, {
    key: 'flushUpdates',
    value: function flushUpdates() {
      var key = this.updateBuffer.shift();
      if (!key) return;

      this.emit('publicChange.appState.' + key, this.stores[key]);
      this.flushUpdates();
    }
  }, {
    key: 'queueUpdate',
    value: function queueUpdate(key) {
      if (this.updateBuffer.indexOf(key) === -1) this.updateBuffer.push(key);
      if (this.config.runsInBrowser || this.config.throttleUpdates) {
        this.flushUpdates();
        return;
      }

      if (!(this.config.runsInBrowser && window.requestAnimationFrame)) {
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

      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      if (this.config.debugMode) {
        var data = [].concat(_toConsumableArray(args));
        var time = new Date().toLocaleTimeString();
        var unsub = name === 'removeListener' ? data.shift() : '';
        var msg = 'ezFlux | ' + time + ' ' + name + ' ' + unsub;
        var color = colorMap[name.split('.')[0]] || 'gray';

        this.bus.history[time + ' ' + msg] = { time: time, msg: msg, data: data };

        if (this.config.runsInBrowser) {
          var _logger;

          if (!this.config.logAppState) this.logger.log('%c' + msg, 'color:' + color);else (_logger = this.logger).trace.apply(_logger, ['%c' + msg, 'color:' + color, '\n\n'].concat(_toConsumableArray(data), ['\n\n']));
        }
      }
      this.bus.emit.apply(this.bus, [name].concat(_toConsumableArray(args)));
    }
  }]);

  return Flux;
}();

exports.default = Flux;