/* @flow */
type Key = string;
type Value = any;
type Callback = Function;
type EventName = Key;
type ObjectLoopFunction = (Key, Value, index: number) => void;
type ObjectProperties = { get?: Function, set?: Function, enumerable?: boolean, value?: any };
type AssignComputed = <K, V>({K: { ['get' | 'set']: V } }) => V;
type AssignedComputed<DefComputed> = $ObjMap<DefComputed, AssignComputed>;

export type StoreMethods<Store> = {
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

export type State<DefState, DefComputed: {}> = (
  DefState &
  AssignedComputed<DefComputed>
);

export type Options<DefState, Fns, Children, DefComputed> = {
  name?: string,
  immutable?: boolean,
  afterCreation?: () => void,
  state?: DefState,
  methods?: Fns,
  computed?: DefComputed,
  children?: Children,
};

export type Store<DefState: {}, Fns: {}, Children: {}, DefComputed: {}> = (
  Fns &
  DefState &
  Children &
  AssignedComputed<DefComputed> &
  StoreMethods<Store<DefState, Fns, Children, DefComputed>>
);

const define = Object.defineProperty;

export const plugins: Function[] = [];

export function createStore
<DefState: {}, DefComputed: {}, Fns: {}, Children: {}>(
  options: Options<DefState, DefComputed, Fns, Children> = {},
): * {
  const { methods, computed, children, immutable, afterCreation } = options;
  const childCopies = {};
  const state: State<DefState, DefComputed> = { ...options.state };
  const defaultState: State<DefState, DefComputed> = { ...options.state };
  const store = {
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
  const loop = (obj?: any, cb: ObjectLoopFunction): void => {
    if (!obj) return;
    const keys = Object.keys(obj);
    for (let i = keys.length; i--;) {
      const key = keys[i];

      if (store[key]) throw new Error(`key "${key}" already taken`);
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

  loop(children || {}, (key, child) => {
    const props: ObjectProperties = { enumerable: true, get: () => child, set: child.$assign };

    child.$on('change', () => store.$emit('change', store, key));
    define(store, key, props);
    define(state, key, props);
    define(childCopies, key, { enumerable: true, get: () => child.$copy() });
  });

  loop(computed, (key, { get, set }: { set?: Function, get?: Function }) => {
    const props: ObjectProperties = { enumerable: true };

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
