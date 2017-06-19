/* @flow */
import type { Store, State, Options } from '../index';

type DebugPayload = {
  eventType: 'state change' | 'child change' | 'method called',
  storeName: string,
  childName?: string,
  methodName?: string,
  store: Store,
  state: Object,
};

export default function createDebugger(cb: DebugPayload => void) {
  if (typeof cb !== 'function') throw new Error('createDebugger was called without callback');

  return (state: State, store: Store, { name: storeName = '' }: Options) => {
    if (!storeName) throw new Error('ezFlux debugger: Store name was not given.');
    const stateChange = 'state change';
    const childChange = 'child change';
    const methodEvent = 'method called';

    store.$on(
      'change',
      (storeArg: Store, childName: string | void) =>
        cb({
          eventType: childName ? childChange : stateChange,
          storeName,
          childName,
          store,
          state: store.$copy(),
        }),
    );

    Object
      .entries(store)
      .filter(([key, fn]) => typeof fn === 'function' && key.charAt(0) !== '$')
      .forEach(([key, fn]: [string, any]) => {
        store[key] = (...args) => {
          cb({
            eventType: methodEvent,
            storeName,
            methodName: key,
            store,
            state: store.$copy(),
          });

          return fn(...args);
        };
      });
  };
}
