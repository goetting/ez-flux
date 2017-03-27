/* @flow */
import EventEmitter3 from 'eventemitter3';

type Action = (userData: any, state: Object) => Promise<Object> | Object;
type Actions = { [string]: Action };
type ActionTriggers = { [string]: any => Promise<void> };
type Log = { events?: boolean, history?: boolean, trace?: boolean };
type Config = { log: Log, throttleUpdates?: boolean };
type Options = Config & { initialState?: Object };
type StateConfig = { [name: string]: { values: Object, actions: Actions} };
type Ids = { [id: number]: 1 };
type EventBuffer = { [eventName: string]: Ids };
type HistoryEntry = { time: number, name: string, id?: Ids | number, state: Object, payload?: any };
type History = { [time: number]: HistoryEntry };

const colorMap: Object = { RESET: 'red', trigger: 'cyan', change: 'green' };
let nextId = 0;

export default class EZFlux extends EventEmitter3 {
  static cloneDeep(val: any): any {
    if (!val || typeof val !== 'object') {
      return val;
    }
    if (val instanceof Array) {
      const arrClone: any[] = [];

      for (let i = val.length; i--;) {
        arrClone[i] = this.cloneDeep(val[i]);
      }
      return arrClone;
    }
    const objClone: Object = {};
    const keys = Object.keys(val);

    for (let i = keys.length; i--;) {
      const key = keys[i];

      if (Object.prototype.hasOwnProperty.call(val, key)) {
        objClone[key] = this.cloneDeep(val[key]);
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
    return `trigger:action.${stateName}.${actionName}`;
  }
  static getCanceledEventName(stateName: string, actionName: string): string {
    return `aborted:action.${stateName}.${actionName}`;
  }
  static getChangeEventName(stateName: string): string {
    return `change:state.${stateName}`;
  }
  static getResetEventName(): string {
    return 'RESET';
  }
  static validateScope(name: string, values: any, actions: any) {
    if (!values || typeof values !== 'object') {
      throw new Error(`ezFlux: "${name}" must include a values object`);
    }
    if (!actions || Object.keys(actions).find(key => typeof actions[key] !== 'function')) {
      throw new Error(`ezFlux: "${name}" actions must include dictionary of functions`);
    }
  }

  history: History = {};
  cfg: Config = { throttleUpdates: false, log: { events: false, history: false, trace: false } };
  runsInBrowser: boolean = typeof window !== 'undefined' && !!window.requestAnimationFrame;
  actions: { [string]: ActionTriggers } = {};
  eventBuffer: EventBuffer = {};
  emissionTimeout: any = null;
  state: any;

  resetState: () => void;

  constructor(stateCfg: StateConfig = {}, options: Options = { log: {} }) {
    super();
    let state = {};
    let defaultState = {};
    const scopeNames = Object.keys(stateCfg);
    const initState = options.initialState || {};
    const clone = this.constructor.cloneDeep.bind(this.constructor);

    Object.defineProperty(this, 'state', ({ get: () => clone(state) }: Object));
    this.setConfig(options);

    for (let i = scopeNames.length; i--;) {
      const name = scopeNames[i];
      const { actions, values } = stateCfg[name];

      this.constructor.validateScope(name, values, actions);
      state[name] = clone(values);
      if (initState[name]) Object.assign(state[name], initState[name]);
      this.addScopeToEventSystem(name, actions, state);
    }

    defaultState = clone(state);
    this.resetState = () => {
      this.emit(this.constructor.getResetEventName());

      state = clone(defaultState);
    };
  }

  /*                                   Event Setup                                    */

  addScopeToEventSystem(name: string, actions: Actions, state: Object): void {
    const actionNames = Object.keys(actions);

    for (let i = actionNames.length; i--;) {
      const actionName: string = actionNames[i];
      const action: Action = actions[actionName].bind(this);
      const triggerEventName: string = this.createActionTrigger(name, actionName);
      const changeEventName: string = this.constructor.getChangeEventName(name);
      const canceledEventName: string = this.constructor.getCanceledEventName(name, actionName);

      this.on(triggerEventName, (id, payload): void => {
        const clonedStateValues = this.constructor.cloneDeep(state[name]);
        const actionRes: Object | Promise<Object> = action(payload, clonedStateValues, this);
        const setState = (stateChange: Object): void => {
          if (!stateChange) {
            this.emitOrBuffer(canceledEventName, id);
            return;
          }
          if (typeof stateChange !== 'object') {
            throw new Error(`ezFlux: "${name}.${actionName}": must return falsy value or Object.`);
          }
          Object.assign(state[name], stateChange);
          this.emitOrBuffer(changeEventName, id);
        };

        if (this.constructor.isPromise(actionRes)) actionRes.then(setState);
        else setState(actionRes);
      });
    }
  }

  createActionTrigger(stateName: string, actionName: string): string {
    const canceledEventName: string = this.constructor.getCanceledEventName(stateName, actionName);
    const triggerEventName: string = this.constructor.getTriggerEventName(stateName, actionName);
    const changeEventName: string = this.constructor.getChangeEventName(stateName);

    if (!this.actions[stateName]) this.actions[stateName] = {};

    this.actions[stateName][actionName] = (data: any): Promise<void> =>
      new Promise((res) => {
        const id = this.constructor.generateUID();
        const eventHandler = (idDictionary) => {
          if (!idDictionary[id]) return;
          this.removeListener(changeEventName, eventHandler);
          this.removeListener(canceledEventName, eventHandler);
          res();
        };
        this.on(changeEventName, eventHandler);
        this.on(canceledEventName, eventHandler);
        this.emit(triggerEventName, id, data);
      });
    return triggerEventName;
  }

  /*                                   Event Handling                                    */

  emitOrBuffer(eventName: string, id: number): void {
    if (!this.runsInBrowser || !this.cfg.throttleUpdates) {
      this.emit(eventName, { [id]: 1 });
      return;
    }
    if (!this.eventBuffer[eventName]) this.eventBuffer[eventName] = {};

    this.eventBuffer[eventName][id] = 1;
    window.cancelAnimationFrame(this.emissionTimeout);

    this.emissionTimeout = window.requestAnimationFrame(() => {
      const names = Object.keys(this.eventBuffer);

      for (let i = names.length; i--;) {
        const ids = this.eventBuffer[names[i]];

        this.emit(names[i], ids);
        delete this.eventBuffer[names[i]];
      }
    });
  }

  emit(name: string = '', id?: Ids | number, payload?: any): void {
    super.emit(name, id, payload);
    if (!this.cfg.log.events && !this.cfg.log.history) return;

    const time: number = Date.now();
    const msg: string = `ezFlux | ${name}`;
    const color: string = colorMap[name.split(':')[0]] || 'gray';
    let log = [];

    this.history[time] = { time, name, id, state: this.state };
    if (payload) this.history[time].payload = payload;

    if (this.cfg.log.events) log = this.runsInBrowser ? [`%c${msg}`, `color:${color}`] : [msg];
    if (this.cfg.log.history) log.push(this.history[time]);

    console[this.cfg.log.trace ? 'trace' : 'log'](...log);                                            // eslint-disable-line no-console
  }

  /*                                   Config                                    */

  getConfig(): Config {
    return Object.assign({}, this.cfg);
  }

  setConfig(cfg: Config = { log: {} }): void {
    if (typeof cfg.throttleUpdates === 'boolean') this.cfg.throttleUpdates = cfg.throttleUpdates;
    if (typeof cfg.log === 'object') Object.assign(this.cfg.log, cfg.log);
  }
}
