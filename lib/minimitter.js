'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MiniMitter = function () {
  function MiniMitter() {
    _classCallCheck(this, MiniMitter);

    this.events = {};
    this.addListener = this.on;
    this.removeListener = this.off;
  }

  _createClass(MiniMitter, [{
    key: 'emit',
    value: function emit() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      if (this.events[name]) {
        for (var _len = arguments.length, payload = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          payload[_key - 1] = arguments[_key];
        }

        for (var i = this.events[name].length; i--;) {
          var fn = this.events[name][i];
          fn.apply(undefined, _toConsumableArray(payload));
          if (fn.once) this.off(name, fn);
        }
      }
      return this;
    }
  }, {
    key: 'on',
    value: function on(name, fn) {
      this.emit('newListener', name, fn);
      if (!this.events[name]) this.events[name] = [fn];else this.events[name].push(fn);
      return this;
    }
  }, {
    key: 'once',
    value: function once(name, fn) {
      fn.once = true; // eslint-disable-line no-param-reassign
      this.on(name, fn);
      return this;
    }
  }, {
    key: 'off',
    value: function off(name, fn) {
      if (this.events[name]) {
        var i = this.events[name].indexOf(fn);

        if (i > -1) this.events[name].splice(i, 1);
        this.emit('removeListener', name, fn);
      }
      return this;
    }
  }]);

  return MiniMitter;
}();

exports.default = MiniMitter;