/* @flow */
import MiniMitter from './minimitter';

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
type Config = {
  console?: 'log' | 'trace' | 'error' | 'info' | '',
  recordHistory?: boolean,
  initialState?: Object,
  plugins?: Function[]
};
type HistoryEntry = { time: number, name: string, state: Object, payload: any };
type History = { [time: number]: HistoryEntry };

const colorMap: Object = { RESET: 'red', trigger: 'cyan', change: 'green' };
const isFn = (fn): boolean => typeof fn === 'function';

export default class EZFlux extends MiniMitter {
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
    if (!actions || Object.keys(actions).find(key => !isFn(actions[key]))) {
      throw new Error(`ezFlux: "${name}" - actions must include dictionary of functions`);
    }
    if (afterActions && !isFn(afterActions)) {
      throw new Error(`ezFlux: "${name}" - 'afterActions' must be a function or undefined`);
    }
    if (beforeActions && !isFn(beforeActions)) {
      throw new Error(`ezFlux: "${name}" - 'beforeActions' must be a function or undefined`);
    }
  }

  history: History = {};
  config: Config = {};
  runsInBrowser: boolean = typeof window !== 'undefined' && !!window.requestAnimationFrame;
  actions: { [string]: ActionTriggers } = {};
  defaultState: Object = {};
  state: Object = {};
  plugins: Object = {};

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

    if (options.plugins) {
      for (let i = options.plugins.length; i--;) this.plug(options.plugins[i]);
      delete this.config.plugins;
    }
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
          this.setStateScope(scopeName, stateChange);
          this.emit(eventNames.change);
        } else {
          this.emit(eventNames.canceled);
        }
        res();
      });
    };
  }

  setStateScope(name: string, newState: Object): void {
    this.state = { ...this.state };
    this.state[name] = { ...newState };
    Object.freeze(this.state);
    Object.freeze(this.state[name]);
  }

  emit(name: string = '', payload?: any, res?: TriggerResolver): EZFlux {
    super.emit(name, payload, res);

    if (this.config.recordHistory) {
      const time: number = Date.now();
      const state = {};
      const scopes = Object.keys(this.state);

      for (let i = scopes.length; i--;) state[scopes[i]] = { ...this.state[scopes[i]] };

      this.history[time] = { time, name, state, payload };
    }

    if (this.config.console && console[this.config.console]) {                                      // eslint-disable-line no-console
      const logger = console[this.config.console];                                                  // eslint-disable-line no-console
      const msg: string = `ezFlux | ${name}`;
      const color: string = colorMap[name.split(':')[0]] || 'gray';
      logger(...(this.runsInBrowser ? [`%c${msg}`, `color:${color}`] : [msg]));
    }
    return this;
  }

  resetStateScope(name: string): void {
    if (!this.defaultState[name]) throw new Error(`ezFlux.reset: ${name} not found on state`);
    this.setStateScope(name, this.defaultState[name]);
    this.emit(this.constructor.getEventNames(name).reset);
  }

  resetState(): void {
    const names = Object.keys(this.defaultState);

    for (let i = names.length; i--;) this.resetStateScope(names[i]);
  }

  plug(fn: Function): void {
    if (!isFn(fn)) throw new Error('ezFlux: plugin must be a function');
    Object.assign(this.plugins, fn.apply(this));
  }
}
