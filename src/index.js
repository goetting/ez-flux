/* @flow */
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
type ActionListener = (payload: any, TriggerResolver) => void;
type consoleCFG = 'log' | 'trace' | 'error' | 'info';
type Config = { console?: consoleCFG, recordHistory?: boolean, initialState?: Object };
type HistoryEntry = { time: number, name: string, state: Object, payload: any };
type History = { [time: number]: HistoryEntry };

const colorMap: Object = { RESET: 'red', trigger: 'cyan', change: 'green' };

export class TinyEmitter {
  events: { [string]: Function[] } = {};
  removeListener = this.off;

  emit(name: string, ...args: any[]) {
    if (!this.events[name]) return;
    for (let i = this.events[name].length; i--;) this.events[name][i](...args);
  }

  on(name: string, fn: Function) {
    if (!this.events[name]) this.events[name] = [fn];
    else this.events[name].push(fn);
  }

  once(name: string, fn: Function) {
    this.on(name, (...args: any[]) => {
      fn(...args);
      this.off(name, fn);
    });
  }

  off(name: string, fn: Function) {
    if (!this.events[name]) return;
    const i = this.events[name].findIndex(fn);

    if (i > -1) this.events[name].splice(i, 1);
  }
}

export default class EZFlux extends TinyEmitter {
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
      throw new Error(`ezFlux: "${name}" - must include a values object`);
    }
    if (!actions || Object.keys(actions).find(key => typeof actions[key] !== 'function')) {
      throw new Error(`ezFlux: "${name}" - actions must include dictionary of functions`);
    }
    if (afterActions && typeof afterActions !== 'function') {
      throw new Error(`ezFlux: "${name}" - 'afterActions' must be a function or undefined`);
    }
    if (beforeActions && typeof beforeActions !== 'function') {
      throw new Error(`ezFlux: "${name}" - 'beforeActions' must be a function or undefined`);
    }
  }

  history: History = {};
  config: Config = {};
  runsInBrowser: boolean = typeof window !== 'undefined' && !!window.requestAnimationFrame;
  actions: { [string]: ActionTriggers } = {};
  emissionTimeout: any = null;
  defaultState: Object = {};
  state: Object = {};

  constructor(stateCfg: StateConfig = {}, options: Config = {}) {
    super();
    const scopeNames = Object.keys(stateCfg);
    const initState = options.initialState || {};

    this.config = options;

    for (let i = scopeNames.length; i--;) {
      const name = scopeNames[i];
      const scopeConfig: ScopeConfig = stateCfg[name];

      this.constructor.validateScope(name, scopeConfig);

      this.state[name] = { ...scopeConfig.values };
      this.defaultState[name] = { ...scopeConfig.values };
      if (initState[name]) Object.assign(this.state[name], initState[name]);
      Object.freeze(this.state[name]);

      this.addScopeToEventSystem(name, scopeConfig);
    }
    Object.freeze(this.state);
  }

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
      const trigger = payload => new Promise(res => this.emit(eventNames.triggered, payload, res));      // eslint-disable-line no-loop-func

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
    return (payload, res): void => {
      let i = actionCycle.length - 1;
      const stateChange = Object.seal({ ...this.state[scopeName] });
      const runSeries = (actions, cb) => {
        const result = actions[i](payload, stateChange, this, actionName);
        const validateActionResult = (actionResult) => {
          if (!actionResult || typeof actionResult !== 'object') {
            cb(false);
            return;
          }
          Object.assign(stateChange, actionResult);
          i -= 1;
          if (actions[i]) runSeries(actions, cb);
          else cb(true);
        };

        if (!result || !result.then) validateActionResult(result);
        else result.then(validateActionResult);
      };

      runSeries(actionCycle, (success) => {
        if (success) {
          this.state = { ...this.state };
          this.state[scopeName] = { ...stateChange };
          Object.freeze(this.state);
          Object.freeze(this.state[scopeName]);
          this.emit(eventNames.change);
        } else {
          this.emit(eventNames.canceled);
        }
        res();
      });
    };
  }

  emit(name: string = '', payload?: any, triggerResolver?: TriggerResolver): void {
    super.emit(name, payload, triggerResolver);

    if (this.config.recordHistory) {
      const time: number = Date.now();
      const state = {};
      const scopes = Object.keys(this.state);

      for (let i = scopes.length; i--;) state[scopes[i]] = { ...this.state[scopes[i]] };

      this.history[time] = { time, name, state, payload };
    }

    if (this.config.console && console[this.config.console]) {                                      // eslint-disable-line no-console
      const logger = console[this.config.console];                                                    // eslint-disable-line no-console
      const msg: string = `ezFlux | ${name}`;
      const color: string = colorMap[name.split(':')[0]] || 'gray';
      const log = this.runsInBrowser ? [`%c${msg}`, `color:${color}`] : [msg];
      logger(...log);
    }
  }

  resetStateScope(name: string): void {
    if (!this.defaultState[name]) throw new Error(`ezFlux.reset: ${name} not found on state`);

    this.state = {
      ...this.state,
      ...{ [name]: { ...this.defaultState[name] } },
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
