'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _flux = require('./flux');

var _flux2 = _interopRequireDefault(_flux);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EZFlux = function () {
  function EZFlux() {
    var _this = this;

    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        stores = _ref.stores,
        config = _ref.config;

    _classCallCheck(this, EZFlux);

    this.config = {
      debugMode: true,
      maxListeners: 10,
      logEventData: false,
      bufferActions: false,
      throttleUpdates: false,
      runsInBrowser: typeof process !== 'undefined' && process.title === 'browser'
    };
    if (config) this.setConfig(config);
    this.logger = {
      /* eslint-disable no-console */
      dir: function dir() {
        var _console;

        if (_this.config.debugMode) (_console = console).dir.apply(_console, arguments);
      },
      log: function log() {
        var _console2;

        if (_this.config.debugMode) (_console2 = console).log.apply(_console2, arguments);
      },
      error: function error() {
        var _console3;

        if (_this.config.debugMode) (_console3 = console).error.apply(_console3, arguments);
      },
      trace: function trace() {
        var _console4;

        if (_this.config.debugMode) (_console4 = console).trace.apply(_console4, arguments);
      }
    };
    this.flux = new _flux2.default(this.config, stores, this.logger);
    this.stores = this.flux.stores;
    this.actions = this.flux.actions;
    this.history = this.flux.bus.history;
    this.on = function () {
      var _flux$bus;

      return (_flux$bus = _this.flux.bus).on.apply(_flux$bus, arguments);
    };
    this.once = function () {
      var _flux$bus2;

      return (_flux$bus2 = _this.flux.bus).once.apply(_flux$bus2, arguments);
    };
    this.emit = function () {
      var _flux$bus3;

      return (_flux$bus3 = _this.flux.bus).emit.apply(_flux$bus3, arguments);
    };
    this.removeListener = function () {
      var _flux$bus4;

      return (_flux$bus4 = _this.flux.bus).removeListener.apply(_flux$bus4, arguments);
    };
    this.getAppState = function () {
      return Object.assign({}, _this.flux.appState);
    };
  }

  _createClass(EZFlux, [{
    key: 'getConfig',
    value: function getConfig() {
      return Object.assign({}, this.config);
    }
  }, {
    key: 'setConfig',
    value: function setConfig() {
      var cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (typeof cfg.throttleUpdates === 'boolean') this.config.throttleUpdates = cfg.throttleUpdates;
      if (typeof cfg.runsInBrowser === 'boolean') this.config.runsInBrowser = cfg.runsInBrowser;
      if (typeof cfg.bufferActions === 'boolean') this.config.bufferActions = cfg.bufferActions;
      if (typeof cfg.maxListeners === 'number') this.config.maxListeners = cfg.maxListeners;
      if (typeof cfg.logAppState === 'boolean') this.config.logAppState = cfg.logAppState;
      if (typeof cfg.debugMode === 'boolean') this.config.debugMode = cfg.debugMode;
    }
  }]);

  return EZFlux;
}();

exports.default = EZFlux;