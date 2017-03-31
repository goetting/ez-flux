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
  beforeActions?: BeforeAction,
  afterActions?: AfterAction,
};
type StateConfig = { [name: string]: ScopeConfig };
type ActionTriggers = { [string]: any => Promise<void> };
type HistoryCFG = { record?: boolean, log?: boolean };
type consoleCFG = 'log' | 'trace' | 'error' | 'info';
type Config = { console?: consoleCFG, throttleUpdates?: boolean, history: HistoryCFG };
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
  static getResetEventName(stateName: string): string {
    return `RESET:state.${stateName}`;
  }
  static nextTick(): Promise<void> {
    return new Promise(res => setTimeout(res, 0));
  }
  static validateScope(
    name: string,
    { values, actions, afterActions, beforeActions }: ScopeConfig,
  ): void {
    if (!values || typeof values !== 'object') {
      throw new Error(`ezFlux: "${name}" must include a values object`);
    }
    if (!actions || Object.keys(actions).find(key => typeof actions[key] !== 'function')) {
      throw new Error(`ezFlux: "${name}" actions must include dictionary of functions`);
    }
    if (afterActions && typeof afterActions !== 'function') {
      throw new Error(`ezFlux: "${name}" 'afterActions' must be a function or undefined`);
    }
    if (beforeActions && typeof beforeActions !== 'function') {
      throw new Error(`ezFlux: "${name}" 'beforeActions' must be a function or undefined`);
    }
  }

  history: History = {};
  cfg: Config = { throttleUpdates: false, history: { log: false, record: false } };
  runsInBrowser: boolean = typeof window !== 'undefined' && !!window.requestAnimationFrame;
  actions: { [string]: ActionTriggers } = {};
  eventBuffer: EventBuffer = {};
  emissionTimeout: any = null;
  defaultState: Object;
  state: Object = {};


  constructor(stateCfg: StateConfig = {}, options: Options = { history: {} }) {
    super();
    const scopeNames = Object.keys(stateCfg);
    const initState = options.initialState || {};

    this.setConfig(options);

    for (let i = scopeNames.length; i--;) {
      const name = scopeNames[i];
      const scopeConfig: ScopeConfig = this.constructor.cloneDeep(stateCfg[name]);

      this.constructor.validateScope(name, scopeConfig);

      this.state[name] = scopeConfig.values;
      if (initState[name]) Object.assign(this.state[name], initState[name]);

      this.addScopeToEventSystem(name, scopeConfig);
    }

    this.defaultState = this.constructor.cloneDeep(this.state);
    Object.freeze(this.state);
  }

  /*                                   Event Setup                                    */

  addScopeToEventSystem(name: string, scopeConfig: ScopeConfig): void {
    const actionNames = Object.keys(scopeConfig.actions);
    const { beforeActions, afterActions, actions } = scopeConfig;

    for (let i = actionNames.length; i--;) {
      const actionName: string = actionNames[i];
      const action: Action = actions[actionName];

      this.addActionTrigger(name, actionName);
      this.addActionTriggerListener(name, actionName, action, beforeActions, afterActions);
    }
  }

  addActionTriggerListener(
    scopeName: string,
    actionName: string,
    action: Action,
    beforeActions: BeforeAction | void,
    afterActions: AfterAction | void,
  ) {
    const triggerEventName: string = this.constructor.getTriggerEventName(scopeName, actionName);
    const changeEventName: string = this.constructor.getChangeEventName(scopeName);
    const canceledEventName: string = this.constructor.getCanceledEventName(scopeName, actionName);
    const actionFlow: Function[] = [action];
    let mutableStateScope = Object.seal({ ...this.state[scopeName] });

    Object.freeze(this.state[scopeName]);

    if (beforeActions) actionFlow.push(beforeActions);
    if (afterActions) actionFlow.unshift(afterActions);

    this.on(triggerEventName, async (id, payload): Promise<void> => {
      const stateChange = Object.seal({ ...mutableStateScope });
      const callAndCheck = async (method: Function): Promise<boolean> => {
        const actionResult = await method(payload, stateChange, this, actionName);
        const isValidResult = actionResult && typeof actionResult === 'object';

        if (isValidResult) Object.assign(stateChange, actionResult);
        return isValidResult;
      };
      let success = true;

      for (let i = actionFlow.length; i-- && success;) {
        success = await callAndCheck(actionFlow[i]);
      }
      if (success) {
        this.state = { ...this.state, ...{ [scopeName]: { ...stateChange } } };
        mutableStateScope = Object.seal(stateChange);
        Object.freeze(this.state);
        Object.freeze(this.state[scopeName]);
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
      new Promise(async (res) => {
        await this.constructor.nextTick();

        const id = this.constructor.generateUID();
        const eventHandler = (ids: Ids): void => {
          if (!ids[id]) return;
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
    if (!this.cfg.console || !console[this.cfg.console]) return;                                      // eslint-disable-line no-console

    const logger = console[this.cfg.console];                                                         // eslint-disable-line no-console
    const time: number = Date.now();
    const msg: string = `ezFlux | ${name}`;
    const color: string = colorMap[name.split(':')[0]] || 'gray';
    const log = this.runsInBrowser ? [`%c${msg}`, `color:${color}`] : [msg];

    if (this.cfg.history.record) {
      this.history[time] = { time, name, id, state: this.constructor.cloneDeep(this.state) };
      if (payload) this.history[time].payload = payload;
      if (this.cfg.history.log) log.push(this.history[time]);
    }

    logger(...log);
  }

  /*                                   Config                                    */

  getConfig(): Config {
    return Object.assign({}, this.cfg);
  }

  setConfig(cfg: Config): void {
    if (typeof cfg.throttleUpdates === 'boolean') this.cfg.throttleUpdates = cfg.throttleUpdates;
    if (typeof cfg.console === 'string') this.cfg.console = cfg.console;
    if (typeof cfg.history === 'object') Object.assign(this.cfg.history, cfg.history);
  }

  /*                                   reset                                    */

  resetStateScope(name: string): void {
    if (!this.defaultState[name]) throw new Error(`ezFlux.reset: ${name} not found on state`);

    this.state = {
      ...this.state,
      ...{ [name]: this.constructor.cloneDeep(this.defaultState[name]) },
    };
    Object.freeze(this.state[name]);
    this.emit(this.constructor.getResetEventName(name));
  }

  resetState(): void {
    const names = Object.keys(this.defaultState);

    this.state = {};
    for (let i = names.length; i--;) this.resetStateScope(names[i]);
    Object.freeze(this.state);
  }
}
