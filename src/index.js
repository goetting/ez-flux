/* @flow */
import EventEmitter3 from 'eventemitter3';

type SetState = (stateChange: any) => void;
type Action = (userData: any, state: Object, setState: SetState) => void;
type Actions = { [string]: Action };
type ActionTriggers = { [string]: any => void };
type Config = { debug?: boolean, throttleUpdates?: boolean, maxListeners?: number };
type StateConfig = { [name: string]: { state: Object, actions: Actions} };

const colorMap: Object = { error: 'red', action: 'cyan', change: 'green' };

export default class EZFlux extends EventEmitter3 {
  static cloneDeep(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    let i = 0;

    if (obj instanceof Array) {
      const arrClone: any[] = [];

      for (i = obj.length; i--;) {
        arrClone[i] = this.cloneDeep(obj[i]);
      }
      return arrClone;
    }
    const objClone: Object = {};
    const keys = Object.keys(obj);

    for (i = keys.length; i--;) {
      const key = keys[i];

      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        objClone[key] = this.cloneDeep(obj[key]);
      }
    }
    return objClone;
  }

  history: { [timeMsg: string]: { time: number, msg: string, state: Object } } = {};
  cfg: Config = { debug: true, throttleUpdates: false };
  runsInBrowser: boolean = typeof window !== 'undefined' && !!window.requestAnimationFrame
  actions: { [string]: ActionTriggers } = {};
  updateBuffer: any[] = [];
  updateTimeout: any = null;
  state: any;
  get: any;

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

    appState[name] = this.constructor.cloneDeep(state);                                                    // eslint-disable-line no-param-reassign

    for (let i = actionNames.length; i--;) {
      const actionName: string = actionNames[i];
      const eventName: string = this.createActionTrigger(name, actionName);
      const action: Action = actions[actionName];
      const setState: SetState = (stateChange: Object): void => {
        if (!stateChange || typeof stateChange !== 'object') {
          throw new Error(`${name}.${actionName}: setState argument must be Object`);
        }
        Object.assign(appState[name], stateChange);
        this.queueUpdate(name);
      };

      this.on(eventName, (data): void => {
        action(data, this.state, setState);
      });
    }
  }

  createActionTrigger(stateName: string, actionName: string): string {
    const eventName: string = `action.${stateName}.${actionName}`;

    if (!this.actions[stateName]) this.actions[stateName] = {};
    this.actions[stateName][actionName] = data => this.emit(eventName, data);

    return eventName;
  }

  /**                                   Event Handling                                    */

  flushUpdates(): void {
    const key = this.updateBuffer.shift();
    if (!key) return;

    this.emit(`state.change.${key}`, this.state);
    this.flushUpdates();
  }

  queueUpdate(key: string): void {
    if (this.updateBuffer.indexOf(key) === -1) this.updateBuffer.push(key);
    if (this.runsInBrowser && this.cfg.throttleUpdates) {
      window.cancelAnimationFrame(this.updateTimeout);
      this.updateTimeout = window.requestAnimationFrame(this.flushUpdates);
    } else {
      this.flushUpdates();
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
