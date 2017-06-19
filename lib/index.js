'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.createStore = createStore;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var define = Object.defineProperty;
var plugins = exports.plugins = [];

function createStore() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var methods = options.methods,
      computed = options.computed,
      children = options.children,
      immutable = options.immutable,
      afterCreation = options.afterCreation;

  var childCopies = {};
  var state = _extends({}, options.state);
  var defaultState = _extends({}, options.state);
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
      return _extends({}, state, childCopies);
    },
    $stringify: function $stringify() {
      return JSON.stringify(store.$copy());
    },
    $reset: function $reset() {
      Object.values(children || {}).forEach(function (child) {
        return child.$reset();
      });
      return store.$assign(defaultState);
    },
    $assign: function $assign() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      Object.assign.apply(Object, [state].concat(_toConsumableArray(args)));
      store.$emit('change', store);
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
          if (typeof fn === 'function') {
            fn.apply(undefined, _toConsumableArray(payload));
            if (fn.$once) store.$off(name, fn);
          } else {
            store.$off(name, fn);
          }
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
  var isTaken = function isTaken(key) {
    if (store[key]) throw new Error('key "' + key + '" already taken');
  };
  var loop = function loop(obj, cb) {
    if (!obj) return;
    var keys = Object.keys(obj);
    for (var i = keys.length; i--;) {
      var key = keys[i];

      isTaken(key);
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

  Object.entries(children || {}).forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        child = _ref2[1];

    isTaken(key);

    var props = { enumerable: true, get: function get() {
        return child;
      }, set: child.$assign };

    child.$on('change', function () {
      return store.$emit('change', store, key);
    });
    define(store, key, props);
    define(state, key, props);
    define(childCopies, key, { enumerable: true, get: function get() {
        return child.$copy();
      } });
  });

  loop(computed, function (key, _ref3) {
    var get = _ref3.get,
        set = _ref3.set;

    var props = { enumerable: true };

    props.set = typeof set === 'function' ? set.bind(store) : function () {};
    props.get = typeof get === 'function' ? get.bind(store) : function () {};
    define(store, key, props);
    define(state, key, props);
  });

  if (plugins instanceof Array) plugins.forEach(function (plugin) {
    return plugin(state, store, options);
  });

  Object.seal(state);
  Object.seal(store);

  if (typeof afterCreation === 'function') afterCreation.apply(store);

  return store;
}