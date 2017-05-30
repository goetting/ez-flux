'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = create;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var define = Object.defineProperty;
var plugins = exports.plugins = [];

function create() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var methods = options.methods,
      computed = options.computed,
      children = options.children,
      immutable = options.immutable;

  var state = Object.assign({}, options.state);
  var store = {
    $events: {},
    $keys: function $keys() {
      return Object.keys(state);
    },
    $values: function $values() {
      return Object.values(state);
    },
    $entries: function $entries() {
      return Object.entries(state);
    },
    $copy: function $copy() {
      return Object.assign({}, state);
    },
    $assign: function $assign() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      Object.assign.apply(Object, [state].concat(_toConsumableArray(args)));
      store.$emit('change');
      return store;
    },
    $emit: function $emit() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      if (store.$events[name]) {
        for (var _len2 = arguments.length, payload = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          payload[_key2 - 1] = arguments[_key2];
        }

        for (var i = store.$events[name].length; i--;) {
          var fn = store.$events[name][i];
          fn.apply(undefined, _toConsumableArray(payload));
          if (fn.$once) store.$off(name, fn);
        }
      }
      return store;
    },
    $on: function $on(name, fn) {
      store.$emit('newListener', name, fn);
      if (!store.$events[name]) store.$events[name] = [fn];else store.$events[name].push(fn);
      return store;
    },
    $once: function $once(name, fn) {
      fn.$once = true; // eslint-disable-line no-param-reassign
      store.$on(name, fn);
      return store;
    },
    $off: function $off(name, fn) {
      if (store.$events[name]) {
        var i = store.$events[name].indexOf(fn);

        if (i > -1) store.$events[name].splice(i, 1);
        store.$emit('removeListener', name, fn);
      }
      return store;
    }
  };
  var loop = function loop(obj, cb) {
    if (!obj) return;
    var keys = Object.keys(obj);
    for (var i = keys.length; i--;) {
      var key = keys[i];

      if (store[key]) throw new Error('ezStore: key "' + key + '" already taken');
      cb(key, obj[key], i);
    }
  };

  loop(state, function (key) {
    define(store, key, {
      enumerable: true,
      get: function get() {
        return state[key];
      },
      set: immutable ? undefined : function (val) {
        store.$emit('change', store);
        state[key] = val;
      }
    });
  });

  loop(methods, function (key, method) {
    store[key] = method.bind(store);
  });

  loop(computed, function (key, _ref) {
    var get = _ref.get,
        set = _ref.set;

    var props = { enumerable: true };

    if (typeof set === 'function') props.set = set.bind(store);
    if (typeof get === 'function') props.get = get.bind(store);
    define(store, key, props);
    define(state, key, props);
  });

  loop(children, function (key, child) {
    var props = { enumerable: true, value: child };

    define(store, key, props);
    define(state, key, props);
    child.$on('change', function () {
      return store.$emit('change', store);
    });
  });

  if (plugins instanceof Array) plugins.forEach(function (plugin) {
    return plugin(state, store, options);
  });
  Object.seal(state);
  Object.seal(store);
  return store;
}