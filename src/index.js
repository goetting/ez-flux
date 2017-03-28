/* @flow */
import EventEmitter3 from 'eventemitter3';

type Action = (userData: any, state: Object) => Promise<Object> | Object;
type Actions = { [string]: Action };
type BeforeAction = (
  payload: any,
  values: Object,
  ezFlux: any,
  actionName: string
) => Object | Promise<Object>;
type AfterAction = (
  payload: any,
  values: Object,
  ezFlux: Object,
  actionName: string
) => Object | Promise<Object>;
type ScopeConfig = {
  values: Object,
  actions: Actions,
  beforeAction?: BeforeAction,
  afterAction?: AfterAction,
};
type StateConfig = { [name: string]: ScopeConfig };
type ActionTriggers = { [string]: any => Promise<void> };
type Log = { events?: boolean, history?: boolean, trace?: boolean };
type Config = { log: Log, throttleUpdates?: boolean };
type Options = Config & { initialState?: Object };
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
  static validateScope(name: string, { values, actions, afterAction, beforeAction }: ScopeConfig) {
    if (!values || typeof values !== 'object') {
      throw new Error(`ezFlux: "${name}" must include a values object`);
    }
    if (!actions || Object.keys(actions).find(key => typeof actions[key] !== 'function')) {
      throw new Error(`ezFlux: "${name}" actions must include dictionary of functions`);
    }
    if (afterAction && typeof afterAction !== 'function') {
      throw new Error(`ezFlux: "${name}" 'afterAction' must be a function or undefined`);
    }
    if (afterAction && typeof beforeAction !== 'function') {
      throw new Error(`ezFlux: "${name}" 'beforeAction' must be a function or undefined`);
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
      const scopeConfig: ScopeConfig = stateCfg[name];

      this.constructor.validateScope(name, stateCfg[name]);
      state[name] = clone(scopeConfig.values);
      if (initState[name]) Object.assign(state[name], initState[name]);
      this.addScopeToEventSystem(state, name, scopeConfig);
    }

    defaultState = clone(state);
    this.resetState = () => {
      this.emit(this.constructor.getResetEventName());

      state = clone(defaultState);
    };
  }

  /*                                   Event Setup                                    */

  addScopeToEventSystem(state: Object, name: string, scopeConfig: ScopeConfig): void {
    const actionNames = Object.keys(scopeConfig.actions);
    let { beforeAction, afterAction } = scopeConfig;

    if (beforeAction) beforeAction = beforeAction.bind(this);
    if (afterAction) afterAction = afterAction.bind(this);


    for (let i = actionNames.length; i--;) {
      const actionName: string = actionNames[i];
      const action: Action = scopeConfig.actions[actionName].bind(this);

      this.addActionTrigger(name, actionName);
      this.addActionTriggerListener(state, name, actionName, action, beforeAction, afterAction);
    }
  }

  addActionTriggerListener(
    state: Object,
    scopeName: string,
    actionName: string,
    action: Action,
    beforeAction: BeforeAction | void,
    afterAction: AfterAction | void,
  ) {
    const triggerEventName: string = this.constructor.getTriggerEventName(scopeName, actionName);
    const changeEventName: string = this.constructor.getChangeEventName(scopeName);
    const canceledEventName: string = this.constructor.getCanceledEventName(scopeName, actionName);

    this.on(triggerEventName, async (id, payload): Promise<void> => {
      const stateChange = this.constructor.cloneDeep(state[scopeName]);
      const attemptToAssignResult = async (method: Function | void): Promise<boolean> => {
        if (!method) return true;
        const actionResult = await method(payload, stateChange, this, actionName);

        if (!actionResult || typeof actionResult !== 'object') {
          return false;
        }
        Object.assign(stateChange, actionResult);
        return true;
      };

      if (
        await attemptToAssignResult(beforeAction) &&
        await attemptToAssignResult(action) &&
        await attemptToAssignResult(afterAction)
      ) {
        Object.assign(state[scopeName], stateChange);
        this.emitOrBuffer(changeEventName, id);
      } else {
        this.emitOrBuffer(canceledEventName, id);
      }
    });
  }

  addActionTrigger(scopeName: string, actionName: string) {
    const canceledEventName: string = this.constructor.getCanceledEventName(scopeName, actionName);
    const triggerEventName: string = this.constructor.getTriggerEventName(scopeName, actionName);
    const changeEventName: string = this.constructor.getChangeEventName(scopeName);

    if (!this.actions[scopeName]) this.actions[scopeName] = {};

    this.actions[scopeName][actionName] = (data: any): Promise<void> =>
      new Promise((res) => {
        const id = this.constructor.generateUID();
        const eventHandler = (idDictionary: Ids): void => {
          if (!idDictionary[id]) return;
          this.removeListener(changeEventName, eventHandler);
          this.removeListener(canceledEventName, eventHandler);
          res();
        };
        this.on(changeEventName, eventHandler);
        this.on(canceledEventName, eventHandler);
        this.emit(triggerEventName, id, data);
      });
  }

  /*                                   Event Handling                                    */

  emitOrBuffer(eventName: string, id: number): void {
    if (!this.runsInBrowser || !this.cfg.throttleUpdates) {
      this.emit(eventName, { [id]: 1 });
      return;
    }
    if (!this.eventBuffer[eventName]) this.eventBuffer[eventName] = { [id]: 1 };
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
