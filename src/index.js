/* @flow */
type Key = string;
type Value = any;
type Callback = Function;
type EventName = Key;
type ObjectLoopFunction = (Key, Value, index: number) => void;
type State = Object;
type Store = {
  $events: { [EventName]: Callback[] },
  $keys: () => Key[],
  $values: () => Value[],
  $entries: () => [Key, Value][],
  $copy: () => Object,
  $reset: () => Store,
  $assign: (...args: Object[]) => Store,
  $emit: (EventName, ...any[]) => Store,
  $on: (EventName, Callback) => Store,
  $once: (EventName, Callback) => Store,
  $off: (EventName, Callback) => Store,
};
type Computed = { set?: Function, get?: Function };
type Properties = Computed & { enumerable?: boolean, value?: any };
type Options = {
  state?: Object,
  methods?: { [Key]: Function },
  computed?: { [Key]: Properties },
  children?: { [Key]: Store },
  immutable?: boolean,
  afterCreation?: () => void,
};
type Plugin = (State, Store, Options) => void;

const define = Object.defineProperty;
export const plugins: Plugin[] = [];

export function createStore(options: Options = {}): Store {
  const { methods, computed, children, immutable, afterCreation } = options;
  const childCopies = {};
  const state: State = { ...options.state };
  const defaultState: State = { ...options.state };
  const store: Store = {
    $events: {},
    $keys: () => Object.keys(state),
    $values: () => Object.values(state),
    $entries: () => Object.entries(state),
    $copy: () => ({ ...state, ...childCopies }),
    $reset: () => {
      Object.values(children || {}).forEach((child: any) => child.$reset());
      return store.$assign(defaultState);
    },
    $assign(...args: Object[]) {
      Object.assign(state, ...args);
      store.$emit('change', store);
      return store;
    },
    $emit(name = '', ...payload?: any[]) {
      if (store.$events[name]) {
        for (let i = store.$events[name].length; i--;) {
          const fn = store.$events[name][i];
          if (typeof fn === 'function') {
            fn(...payload);
            if (fn.$once) store.$off(name, fn);
          } else {
            store.$off(name, fn);
          }
        }
      }
      return store;
    },
    $on(name, fn) {
      store.$emit('newListener', name, fn);
      if (!store.$events[name]) store.$events[name] = [fn];
      else store.$events[name].push(fn);
      return store;
    },
    $once(name, fn) {
      fn.$once = true;                                                                                   // eslint-disable-line no-param-reassign
      store.$on(name, fn);
      return store;
    },
    $off(name, fn) {
      if (store.$events[name]) {
        const i = store.$events[name].indexOf(fn);

        if (i > -1) store.$events[name].splice(i, 1);
        store.$emit('removeListener', name, fn);
      }
      return store;
    },
  };
  const isTaken = (key) => { if (store[key]) throw new Error(`key "${key}" already taken`); };
  const loop = (obj?: Object, cb: ObjectLoopFunction): void => {
    if (!obj) return;
    const keys = Object.keys(obj);
    for (let i = keys.length; i--;) {
      const key = keys[i];

      isTaken(key);
      cb(key, obj[key], i);
    }
  };

  loop(state, (key) => {
    define(store, key, {
      enumerable: true,
      get: () => state[key],
      set: immutable ? undefined : (val) => {
        store.$emit('change', store);
        state[key] = val;
      },
    });
  });

  loop(methods, (key, method) => { store[key] = method.bind(store); });

  Object.entries(children || {}).forEach(([key, child]: [string, Store | any]) => {
    isTaken(key);

    const props: Properties = { enumerable: true, get: () => child, set: child.$assign };

    child.$on('change', () => store.$emit('change', store, key));
    define(store, key, props);
    define(state, key, props);
    define(childCopies, key, { enumerable: true, get: () => child.$copy() });
  });

  loop(computed, (key, { get, set }: Computed) => {
    const props: Properties = { enumerable: true };

    props.set = typeof set === 'function' ? set.bind(store) : () => {};
    props.get = typeof get === 'function' ? get.bind(store) : () => {};
    define(store, key, props);
    define(state, key, props);
  });

  if (plugins instanceof Array) plugins.forEach(plugin => plugin(state, store, options));

  Object.seal(state);
  Object.seal(store);

  if (typeof afterCreation === 'function') afterCreation.apply(store);

  return store;
}

