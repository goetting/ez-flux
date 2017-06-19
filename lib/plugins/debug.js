'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = createDebugger;
function createDebugger(cb) {
  if (typeof cb !== 'function') throw new Error('createDebugger was called without callback');

  return function (state, store, _ref) {
    var _ref$name = _ref.name,
        storeName = _ref$name === undefined ? '' : _ref$name;

    if (!storeName) throw new Error('ezFlux debugger: Store name was not given.');
    var stateChange = 'state change';
    var childChange = 'child change';
    var methodEvent = 'method called';

    store.$on('change', function (storeArg, childName) {
      return cb({
        eventType: childName ? childChange : stateChange,
        storeName: storeName,
        childName: childName,
        store: store,
        state: store.$copy()
      });
    });

    Object.entries(store).filter(function (_ref2) {
      var _ref3 = _slicedToArray(_ref2, 2),
          key = _ref3[0],
          fn = _ref3[1];

      return typeof fn === 'function' && key.charAt(0) !== '$';
    }).forEach(function (_ref4) {
      var _ref5 = _slicedToArray(_ref4, 2),
          key = _ref5[0],
          fn = _ref5[1];

      store[key] = function () {
        cb({
          eventType: methodEvent,
          storeName: storeName,
          methodName: key,
          store: store,
          state: store.$copy()
        });

        return fn.apply(undefined, arguments);
      };
    });
  };
}