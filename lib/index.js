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
  function EZFlux(state, config) {
    _classCallCheck(this, EZFlux);

    this.config = {
      debug: true,
      maxListeners: 10,
      logEventData: false,
      throttleUpdates: false,
      runsInBrowser: typeof process !== 'undefined' && process.title === 'browser'
    };
    this.actions = {};

    if (config) this.setConfig(config);

    var flux = new _flux2.default(state, this.config);

    if (this.config.debug) this.flux = flux;

    this.actions = flux.actionTriggers;
    this.state = flux.stateGetters;
    this.history = flux.bus.history;
    this.on = function () {
      var _flux$bus;

      return (_flux$bus = flux.bus).on.apply(_flux$bus, arguments);
    };
    this.once = function () {
      var _flux$bus2;

      return (_flux$bus2 = flux.bus).once.apply(_flux$bus2, arguments);
    };
    this.emit = function () {
      var _flux$bus3;

      return (_flux$bus3 = flux.bus).emit.apply(_flux$bus3, arguments);
    };
    this.removeListener = function () {
      var _flux$bus4;

      return (_flux$bus4 = flux.bus).removeListener.apply(_flux$bus4, arguments);
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
      if (typeof cfg.maxListeners === 'number') this.config.maxListeners = cfg.maxListeners;
      if (typeof cfg.logAppState === 'boolean') this.config.logAppState = cfg.logAppState;
      if (typeof cfg.debug === 'boolean') this.config.debug = cfg.debug;
    }
  }]);

  return EZFlux;
}();

exports.default = EZFlux;