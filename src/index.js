/* @flow */
import EventEmitter3 from 'eventemitter3';

type Action = (userData: any, state: Object) => Promise<Object> | Object;
type Actions = { [string]: Action };
type ActionTriggers = { [string]: any => Promise<void> };
type Config = { debug?: boolean, throttleUpdates?: boolean, maxListeners?: number };
type StateConfig = { [name: string]: { state: Object, actions: Actions} };
type EventBuffer = { [eventName: string]: { [id: number]: 1 } };

const colorMap: Object = { error: 'red', action: 'cyan', change: 'green' };
let nextId = 0;

export default class EZFlux extends EventEmitter3 {
  static cloneDeep(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Array) {
      const arrClone: any[] = [];

      for (let i = obj.length; i--;) {
        arrClone[i] = this.cloneDeep(obj[i]);
      }
      return arrClone;
    }
    const objClone: Object = {};
    const keys = Object.keys(obj);

    for (let i = keys.length; i--;) {
      const key = keys[i];

      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        objClone[key] = this.cloneDeep(obj[key]);
      }
    }
    return objClone;
  }
  static isPromise(val: any): boolean {
    return val && typeof val.then === 'function';
  }
  static generateUID(): number {
    return nextId++;
  }
  static getTriggerEventName(stateName: string, actionName: string): string {
    return `action.trigger.${stateName}.${actionName}`;
  }
  static getChangeEventName(stateName: string): string {
    return `state.change.${stateName}`;
  }

  history: { [timeMsg: string]: { time: number, msg: string, state: Object } } = {};
  cfg: Config = { debug: true, throttleUpdates: false };
  runsInBrowser: boolean = typeof window !== 'undefined' && !!window.requestAnimationFrame
  actions: { [string]: ActionTriggers } = {};
  eventBuffer: EventBuffer = {};
  emissionTimeout: any = null;
  state: any;

  constructor(stateCfg: StateConfig = {}, cfg: Config = {}) {
    super();
    const appState = {};
    const scopeNames = Object.keys(stateCfg);

    Object.defineProperty(this, 'state', ({ get: () => this.constructor.cloneDeep(appState) }: Object));
    if (cfg) this.setConfig(cfg);

    for (let i = scopeNames.length; i--;) {
      const { actions, state } = stateCfg[scopeNames[i]];

      this.addScopeToState(scopeNames[i], state, actions, appState);
    }
  }

  /**                                   State Configuration                                    */

  addScopeToState(name: string, state: Object, actions: Actions, appState: Object): void {
    if (!state || typeof state !== 'object') {
      throw new Error(`ezFlux: "${name}" must include a state object`);
    }
    if (!actions || Object.keys(actions).find(key => typeof actions[key] !== 'function')) {
      throw new Error(`ezFlux: "${name}" actions must include dictionary of functions`);
    }
    const actionNames = Object.keys(actions);

    appState[name] = this.constructor.cloneDeep(state);                                                // eslint-disable-line no-param-reassign

    for (let i = actionNames.length; i--;) {
      const actionName: string = actionNames[i];
      const action: Action = actions[actionName];
      const triggerEventName: string = this.createActionTrigger(name, actionName);
      const changeEventName: string = this.constructor.getChangeEventName(name);

      this.eventBuffer[changeEventName] = {};
      this.on(triggerEventName, (data, id): void => {
        const actionRes: Object | Promise<Object> = action(data, this);
        const setState = (stateChange: Object): void => {
          if (!stateChange || typeof stateChange !== 'object') {
            throw new Error(`ezFlux: "${name}.${actionName}": action did not return an Object.`);
          }
          Object.assign(appState[name], stateChange);
          this.emitOrBuffer(changeEventName, id);
        };
        if (this.constructor.isPromise(actionRes)) actionRes.then(setState);
        else setState(actionRes);
      });
    }
  }

  createActionTrigger(stateName: string, actionName: string): string {
    const triggerEventName: string = this.constructor.getTriggerEventName(stateName, actionName);
    const changeEventName: string = this.constructor.getChangeEventName(stateName);

    if (!this.actions[stateName]) this.actions[stateName] = {};

    this.actions[stateName][actionName] = (data: any): Promise<void> =>
      new Promise((res) => {
        const id = this.constructor.generateUID();
        const eventHandler = (idDictionary) => {
          if (!idDictionary[id]) return;
          this.removeListener(changeEventName, eventHandler);
          res();
        };
        this.on(changeEventName, eventHandler);
        this.emit(triggerEventName, data, id);
      });
    return triggerEventName;
  }

  /**                                   Event Handling                                    */

  emitOrBuffer(eventName: string, id: number): void {
    if (!this.runsInBrowser || !this.cfg.throttleUpdates) {
      this.emit(eventName, { [id]: 1 });
      return;
    }
    this.eventBuffer[eventName][id] = 1;
    window.cancelAnimationFrame(this.emissionTimeout);
    this.emissionTimeout = window.requestAnimationFrame(this.emitBuffered);
  }

  emitBuffered(): void {
    const names = Object.keys(this.eventBuffer);

    for (let i = names.length; i--;) {
      const ids = this.eventBuffer[names[i]];

      this.emit(names[i], ids);
    }
  }

  emit(name: string = '', ...args: any[]): void {
    super.emit(name, ...args);
    if (!this.cfg.debug) return;

    const state = this.state;
    const time: number = new Date().getTime();
    const msg: string = `ezFlux | ${time} ${name}`;
    const color: string = colorMap[name.split('.')[0]] || 'gray';

    this.history[`${time} ${msg}`] = { time, msg, state };

    if (this.runsInBrowser) console.log(`%c${msg}`, `color:${color}`, { state });                       // eslint-disable-line no-console
    else console.log(msg, { state });                                                                   // eslint-disable-line no-console
  }

  /**                                   Config                                    */

  getConfig(): Config {
    return Object.assign({}, this.cfg);
  }

  setConfig(cfg: Config = {}): void {
    if (typeof cfg.throttleUpdates === 'boolean') this.cfg.throttleUpdates = cfg.throttleUpdates;
    if (typeof cfg.debug === 'boolean') this.cfg.debug = cfg.debug;
  }
}
