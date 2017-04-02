/* @flow */
import EventEmitter3 from 'eventemitter3';

type EventNames = { triggered: string, change: string, canceled: string, reset: string };
type Action = (
  userData: any,
  state: Object,
  ezFlux: any,
  actionName: string
) => Promise<Object> | Object;
type Actions = { [string]: Action };
type ScopeConfig = {
  values: Object,
  actions: Actions,
  beforeActions?: Action,
  afterActions?: Action,
};
type TriggerResolver = () => void;
type StateConfig = { [name: string]: ScopeConfig };
type ActionTrigger = (payload: any) => Promise<void>;
type ActionTriggers = { [string]: ActionTrigger };
type ActionListener = (payload: any, TriggerResolver) => Promise<void>;
type HistoryCFG = { record?: boolean, log?: boolean };
type consoleCFG = 'log' | 'trace' | 'error' | 'info';
type Config = { console?: consoleCFG, throttleUpdates?: boolean, history: HistoryCFG };
type Options = Config & { initialState?: Object };
type EventBuffer = { [eventName: string]: TriggerResolver[] };
type HistoryEntry = { time: number, name: string, state: Object, payload?: any };
type History = { [time: number]: HistoryEntry };

const nextTick = (cb: Function): Promise<void> => new Promise(res => setTimeout(cb(res), 0));
const colorMap: Object = { RESET: 'red', trigger: 'cyan', change: 'green' };

export default class EZFlux extends EventEmitter3 {
  static cloneDeep(val: any): any {
    if (!val || typeof val !== 'object') return val;
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
  static getEventNames(stateName: string, actionName: string = ''): EventNames {
    return {
      triggered: `triggered:action.${stateName}.${actionName}`,
      canceled: `canceled:action.${stateName}.${actionName}`,
      change: `change:state.${stateName}`,
      reset: `RESET:state.${stateName}`,
    };
  }
  static getActionCycle(action: Action, beforeActions?: Action, afterActions?: Action): Action[] {
    const cycle: Action[] = [action];

    if (beforeActions) cycle.push(beforeActions);
    if (afterActions) cycle.unshift(afterActions);

    return cycle;
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
      Object.freeze(this.state[name]);

      this.addScopeToEventSystem(name, scopeConfig);
    }

    this.defaultState = this.constructor.cloneDeep(this.state);
    Object.freeze(this.state);
  }

  /*                                   Event Setup                                    */

  addScopeToEventSystem(scopeName: string, scopeConfig: ScopeConfig): void {
    const actionNames = Object.keys(scopeConfig.actions);
    const { beforeActions, afterActions, actions } = scopeConfig;

    this.actions[scopeName] = {};

    for (let i = actionNames.length; i--;) {
      const actionName = actionNames[i];
      const eventNames = this.constructor.getEventNames(scopeName, actionName);
      const action = actions[actionName];
      const actionCycle = this.constructor.getActionCycle(action, beforeActions, afterActions);
      const listener = this.getActionListener(scopeName, actionName, actionCycle, eventNames);
      const trigger = payload => nextTick(res => this.emit(eventNames.triggered, payload, res));

      this.actions[scopeName][actionName] = trigger;
      this.on(eventNames.triggered, listener);
    }
  }

  getActionListener(
    scopeName: string,
    actionName: string,
    actionCycle: Action[],
    eventNames: EventNames,
  ): ActionListener {
    return async (payload, res): Promise<void> => {
      const stateChange = Object.seal({ ...this.state[scopeName] });
      const callAndCheck = async (method: Function): Promise<boolean> => {
        const actionResult = await method(payload, stateChange, this, actionName);
        const isValidResult = actionResult && typeof actionResult === 'object';

        if (isValidResult) Object.assign(stateChange, actionResult);
        return isValidResult;
      };
      let success = true;

      for (let i = actionCycle.length; i-- && success;) {
        success = await callAndCheck(actionCycle[i]);
      }
      if (success) {
        this.state = { ...this.state };
        this.state[scopeName] = { ...stateChange };
        Object.freeze(this.state);
        Object.freeze(this.state[scopeName]);
        this.emitOrBuffer(eventNames.change, null, res);
      } else {
        this.emitOrBuffer(eventNames.canceled, null, res);
      }
    };
  }

  /*                                   Event Handling                                    */

  emitOrBuffer(eventName: string, payload: any, triggerResolver?: TriggerResolver): void {
    if (!this.runsInBrowser || !this.cfg.throttleUpdates) {
      this.emit(eventName);
      if (triggerResolver) triggerResolver();
      return;
    }
    if (!this.eventBuffer[eventName]) this.eventBuffer[eventName] = [];
    if (triggerResolver) this.eventBuffer[eventName].push(triggerResolver);

    window.cancelAnimationFrame(this.emissionTimeout);

    this.emissionTimeout = window.requestAnimationFrame(() => {
      const names = Object.keys(this.eventBuffer);

      for (let i = names.length; i--;) {
        this.eventBuffer[names[i]].forEach(res => res());
        this.emit(names[i]);
        delete this.eventBuffer[names[i]];
      }
    });
  }

  emit(name: string = '', payload?: any, triggerResolver?: TriggerResolver): void {
    super.emit(name, payload, triggerResolver);
    if (!this.cfg.console || !console[this.cfg.console]) return;                                      // eslint-disable-line no-console

    const logger = console[this.cfg.console];                                                         // eslint-disable-line no-console
    const time: number = Date.now();
    const msg: string = `ezFlux | ${name}`;
    const color: string = colorMap[name.split(':')[0]] || 'gray';
    const log = this.runsInBrowser ? [`%c${msg}`, `color:${color}`] : [msg];

    if (this.cfg.history.record) {
      this.history[time] = { time, name, state: this.constructor.cloneDeep(this.state) };
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
    this.emit(this.constructor.getEventNames(name).reset);
  }

  resetState(): void {
    const names = Object.keys(this.defaultState);

    this.state = {};
    for (let i = names.length; i--;) this.resetStateScope(names[i]);
    Object.freeze(this.state);
  }
}
