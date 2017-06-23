/* @flow */
import type { Store, State, Options } from '../index';

type Payload<DefState, Fns, Children, DefComputed> = {
  eventType: 'state change' | 'child change' | 'method called',
  storeName: string,
  childName?: string,
  methodName?: string,
  store: Store<DefState, Fns, Children, DefComputed>,
  state: State<DefState, DefComputed>,
};

export default function createDebugger
<DefState: {}, Fns: {}, Children: {}, DefComputed: {}>(
  cb: Payload<DefState, Fns, Children, DefComputed> => void,
) {
  if (typeof cb !== 'function') throw new Error('createDebugger was called without callback');

  return (
    state: State<DefState, DefComputed>,
    store: Store<DefState, Fns, Children, DefComputed>,
    { name: storeName = '' }: Options<DefState, Fns, Children, DefComputed>,
  ) => {
    if (!storeName) throw new Error('ezFlux debugger: Store name was not given.');
    const stateChange = 'state change';
    const childChange = 'child change';
    const methodEvent = 'method called';

    store.$on(
      'change',
      (_, childName: string | void) =>
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
