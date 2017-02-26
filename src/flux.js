/* @flow */
import EventEmitter from 'eventemitter3';

type Reactions = { [string]: any => Object };

export type EZFluxConfig = {
  debugMode?: boolean,
  logAppState?: boolean,
  bufferActions?: boolean,
  throttleUpdates?: boolean,
  maxListeners?: number,
  runsInBrowser?: boolean,
};
export type Logger = {
  dir: any => void,
  log: any => void,
  error: any => void,
  trace: any => void,
};
export type StoreConfig = {
  state?: Object,
  stateTypes?: { [stateKey: string]: string },
  reactions: Reactions,
};
export type ValidStoreConfig = {
  name: string,
  isValid: boolean,
  state: Object,
  stateTypes: { [stateKey: string]: string },
  reactions: Reactions,
};
export type StoreConfigs = { [name: string]: StoreConfig};
export type Store = { reactions: Reactions, stateTypes: Object, getState: Object };

const colorMap: Object = {
  error: 'red',
  action: 'cyan',
  remote: 'magenta',
  tracking: 'gray',
  change: 'green',
  removeListener: 'gray',
};
const stateTypeDefaults: Object = {
  undefined,
  object: null,
  boolean: false,
  number: 0,
  string: '',
  symbol: Symbol('I really wanted to have something falsy here'),
  function: (...unsatisfyinglyUnfalsy) => unsatisfyinglyUnfalsy,
};
const validStateTypes: Object = {
  undefined: false,
  object: true,
  boolean: true,
  number: true,
  string: true,
  symbol: true,
  function: false,
};

export default class Flux {
  static areStateTypesValid(stateTypes: Object): boolean {
    return Object
      .keys(stateTypes)
      .findIndex(type => !validStateTypes[stateTypes[type]]) === -1;
  }

  static stateAndStateTypesMatch(state: Object = {}, stateTypes: Object = {}) {
    return Object
      .keys(state)
      .findIndex(key => stateTypes[key] !== typeof state[key]) === -1;
  }

  static createStoreStateTypes(state: Object): Object {
    const stateTypes = {};
    Object
      .keys(state)
      .forEach((key) => { stateTypes[key] = typeof state[key]; });
    return stateTypes;
  }

  static createStoreState(stateTypes: Object): Object {
    const state = {};
    Object
      .keys(stateTypes)
      .forEach((key) => { state[key] = stateTypeDefaults[stateTypes[key]]; });
    return state;
  }

  bus: EventEmitter;
  config: Object;
  logger: Logger;
  appState: Object;
  stores: Object;
  actions: { [string]: (any) => void };
  updateBuffer: any[];
  updateTimeout: any;
  isDispatching: boolean;
  dispatchBuffer: any[];
  defaultAppState: Object;

  constructor(config: EZFluxConfig = {}, storeConfigs: StoreConfigs = {}, logger: Logger) {
    this.config = config;
    this.logger = logger;

    this.bus = new EventEmitter();
    this.appState = {};
    this.defaultAppState = {};
    this.stores = {};
    this.actions = {};

    this.dispatchBuffer = [];
    this.updateBuffer = [];
    this.isDispatching = false;
    this.updateTimeout = null;

    this.bus.setMaxListeners(config.maxListeners);
    this.bus.history = {};
    this.createStores(storeConfigs);
  }

  /**
                              Store Creation
  */

  createStores(storeConfigs: StoreConfigs): void {
    Object
      .keys(storeConfigs)
      .forEach(name => this.createStore(name, storeConfigs[name]));
  }

  createStore(name: string, storeConfigParam: StoreConfig): void {
    const storeConfig: ValidStoreConfig = this.validateStoreData(name, storeConfigParam);

    if (storeConfig.isValid) {
      this.integrateStoreData(storeConfig);
      this.integrateReactions(storeConfig);
    }
  }

  validateStoreData(
    name: string,
    { state, stateTypes, reactions }: StoreConfig = {},
  ): ValidStoreConfig {
    const res: ValidStoreConfig = {
      name,
      state: state || {},
      stateTypes: stateTypes || {},
      reactions,
      isValid: false,
    };

    if (!reactions || (!state && !stateTypes)) {
      this.logger.error(`${name} store: Must have reactions and state or stateTypes`);
      return res;
    }
    if (Object.keys(reactions).findIndex(key => typeof reactions[key] !== 'function') > -1) {
      this.logger.error(`${name} store: reactions must be a dictionary of functions`);
      return res;
    }
    if (!stateTypes && state) {
      res.stateTypes = this.constructor.createStoreStateTypes(state);
    }
    if (!this.constructor.areStateTypesValid(res.stateTypes)) {
      this.logger.error(`${name} store: state has invalid type. do not use undefined or function`);
      return res;
    }
    if (state) {
      if (!this.constructor.stateAndStateTypesMatch(state, res.stateTypes)) {
        this.logger.error(`${name} store: stateTypes did not match typeof state values.`);
        return res;
      }
    } else {
      res.state = this.constructor.createStoreState(res.stateTypes);
    }
    res.isValid = true;
    return res;
  }

  integrateStoreData({ name, state, stateTypes, reactions }: ValidStoreConfig): void {
    const getState = (): Object => Object.assign({}, this.appState[name]);

    this.appState[name] = Object.assign({}, state);
    this.defaultAppState[name] = Object.assign({}, state);
    this.stores[name] = { reactions, stateTypes, getState };
  }

  integrateReactions({ name, state, stateTypes, reactions }: ValidStoreConfig): void {
    Object
      .keys(reactions)
      .forEach((reactionName: string) => {
        const evName = this.createAction(name, reactionName);

        this.bus.on(evName, (data) => {
          const newState = this.dispatch(reactions[reactionName], data, name);
          const newStateIsValid: boolean = Object
            .keys(newState)
            .findIndex((key) => {
              const isInValid: boolean = !state[key] || typeof newState[key] !== stateTypes[key];
              if (isInValid) {
                this.logger.error(
                  `${name}.reactions.${reactionName}:` +
                  `stateKey ${key} had value ${newState[key]} but should be type ${stateTypes[key]}`,
                );
              }
              return isInValid;
            }) > -1;

          if (newStateIsValid) {
            Object.assign(this.appState[name], state);
            this.queueUpdate(name);
          }
        });
      });
  }

  createAction(store: string, actionName: string): string {
    const evName = `action.${store}.${actionName}`;

    this.actions[store] = this.actions[store] || {};
    this.actions[store][actionName] = (data) => {
      if (this.config.bufferActions && this.isDispatching) {
        this.dispatchBuffer.push({ evName, data });
      } else {
        this.bus.emit(evName, data || {});
      }
    };

    return evName;
  }

  /**
                              Event Handling
  */

  flushDispatchBuffer(): void {
    const toDispatch = this.dispatchBuffer.shift();

    if (!toDispatch) return;

    const { evName, data } = toDispatch;
    this.emit(evName, data);
    this.flushDispatchBuffer();
  }

  dispatch(reaction: any => Object, data: any, storeName: string): Object {
    this.isDispatching = true;
    const newState = reaction(data, this.appState[storeName]);
    this.isDispatching = false;
    this.flushDispatchBuffer();
    if (!typeof newState === 'object' || !Object.keys(newState).length) {
      this.logger.error(`reaction of ${storeName} store did not return an object ot change state`);
      return this.appState[storeName];
    }
    return newState;
  }

  flushUpdates(): void {
    const key = this.updateBuffer.shift();
    if (!key) return;

    this.emit(`publicChange.appState.${key}`, this.stores[key]);
    this.flushUpdates();
  }

  queueUpdate(key: string): void {
    if (this.updateBuffer.indexOf(key) === -1) this.updateBuffer.push(key);
    if (this.config.runsInBrowser || this.config.throttleUpdates) {
      this.flushUpdates();
      return;
    }

    if (!(this.config.runsInBrowser && window.requestAnimationFrame)) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = setTimeout(this.flushUpdates, 60 / 1000);
    } else {
      window.cancelAnimationFrame(this.updateTimeout);
      this.updateTimeout = window.requestAnimationFrame(this.flushUpdates);
    }
  }

  emit(name: string = '', ...args: any[]): void {
    if (this.config.debugMode) {
      const data: any[] = [...args];
      const time: string = new Date().toLocaleTimeString();
      const unsub: string = name === 'removeListener' ? data.shift() : '';
      const msg: string = `ezFlux | ${time} ${name} ${unsub}`;
      const color: string = colorMap[name.split('.')[0]] || 'gray';

      this.bus.history[`${time} ${msg}`] = { time, msg, data };

      if (this.config.runsInBrowser) {
        if (!this.config.logAppState) this.logger.log(`%c${msg}`, `color:${color}`);
        else this.logger.trace(`%c${msg}`, `color:${color}`, '\n\n', ...data, '\n\n');
      }
    }
    this.bus.emit.apply(this.bus, [name, ...args]);
  }
}
