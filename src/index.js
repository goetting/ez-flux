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
};
type Plugin = (State, Store, Options) => void;

const define = Object.defineProperty;
export const plugins: Plugin[] = [];

export default function create(options: Options = {}): Store {
  const { methods, computed, children, immutable } = options;
  const state: State = { ...options.state };
  const store: Store = {
    $events: {},
    $keys: () => Object.keys(state),
    $values: () => Object.values(state),
    $entries: () => Object.entries(state),
    $copy: () => ({ ...state }),
    $assign(...args: Object[]) {
      Object.assign(state, ...args);
      store.$emit('change');
      return store;
    },
    $emit(name = '', ...payload?: any[]) {
      if (store.$events[name]) {
        for (let i = store.$events[name].length; i--;) {
          const fn = store.$events[name][i];
          fn(...payload);
          if (fn.$once) store.$off(name, fn);
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
  const loop = (obj?: Object, cb: ObjectLoopFunction): void => {
    if (!obj) return;
    const keys = Object.keys(obj);
    for (let i = keys.length; i--;) {
      const key = keys[i];

      if (store[key]) throw new Error(`ezStore: key "${key}" already taken`);
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

  loop(computed, (key, { get, set }: Computed) => {
    const props: Properties = { enumerable: true };

    if (typeof set === 'function') props.set = set.bind(store);
    if (typeof get === 'function') props.get = get.bind(store);
    define(store, key, props);
    define(state, key, props);
  });

  loop(children, (key, child: Store) => {
    const props: Properties = { enumerable: true, value: child };

    define(store, key, props);
    define(state, key, props);
    child.$on('change', () => store.$emit('change', store));
  });

  if (plugins instanceof Array) plugins.forEach(plugin => plugin(state, store, options));
  Object.seal(state);
  Object.seal(store);
  return store;
}

