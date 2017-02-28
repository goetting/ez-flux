/* @flow */
import EventEmitter from 'eventemitter3';

type SetState = (stateChange: any) => void;
type Action = (userData: any, stateScope: any, setState: SetState) => void;
type Actions = { [string]: Action };
export type ActionTriggers = { [string]: any => void };
export type EZFluxConfig = {
  debug?: boolean,
  logAppState?: boolean,
  throttleUpdates?: boolean,
  maxListeners?: number,
  runsInBrowser?: boolean,
};
export type StateScopeConfig = {
  state: Object,
  actions: Actions,
};
export type StateConfig = { [name: string]: StateScopeConfig };
export type StateGetters = { get: () => Object } & { [scopeName: string]: Object };

const colorMap: Object = {
  error: 'red',
  action: 'cyan',
  remote: 'magenta',
  tracking: 'gray',
  change: 'green',
  removeListener: 'gray',
};

export default class Flux {
  bus: EventEmitter = new EventEmitter();;
  cfg: Object;
  state: Object = {};
  stateGetters: StateGetters = { get: () => Object.assign({}, this.state) };
  actionTriggers: { [string]: ActionTriggers } = {};
  updateBuffer: any[] = [];
  updateTimeout: any = null;

  constructor(stateConfig: StateConfig = {}, cfg: EZFluxConfig = {}) {
    this.cfg = cfg;

    this.bus.setMaxListeners(cfg.maxListeners);
    this.bus.history = {};

    Object.keys(stateConfig).forEach(name => this.addStateScope(name, stateConfig[name]));
  }

  /**
                              State Configuration
  */

  addStateScope(name: string, { state, actions }: StateScopeConfig): void {
    if (!state || typeof state !== 'object') {
      if (this.cfg.debug) console.error(`state "${name}" must include a state object`); // eslint-disable-line no-console
      return;
    }
    if (!actions || Object.keys(actions).find(key => typeof actions[key] !== 'function')) {
      if (this.cfg.debug) console.error(`state "${name}" actions must include dictionary of functions`); // eslint-disable-line no-console
      return;
    }
    this.state[name] = Object.assign({}, state);
    this.stateGetters[name] = { get: () => Object.assign({}, this.state[name]) };

    Object.keys(actions).forEach((actionName: string) => {
      const eventName: string = this.createActionTrigger(name, actionName);
      const action: Action = actions[actionName];
      const setState: SetState = (stateChange: Object): void => {
        if (!stateChange || typeof stateChange !== 'object') {
          if (this.cfg.debug) console.error(`${name}.${actionName}: setState argument must be Object`); // eslint-disable-line no-console
          return;
        }
        Object.assign(this.state[name], stateChange);
        this.queueUpdate(name);
      };

      this.bus.on(eventName, (data): void => {
        action(data, this.state[name].get(), setState);
      });
    });
  }

  createActionTrigger(stateName: string, actionName: string): string {
    const eventName: string = `action.${stateName}.${actionName}`;

    if (!this.actionTriggers[stateName]) this.actionTriggers[stateName] = {};
    this.actionTriggers[stateName][actionName] = data => this.bus.emit(eventName, data || {});

    return eventName;
  }

  /**
                              Event Handling
  */

  flushUpdates(): void {
    const key = this.updateBuffer.shift();
    if (!key) return;

    this.emit(`state.change.${key}`, Object.assign(this.state[key]));
    this.flushUpdates();
  }

  queueUpdate(key: string): void {
    if (this.updateBuffer.indexOf(key) === -1) this.updateBuffer.push(key);
    if (this.cfg.runsInBrowser || this.cfg.throttleUpdates) {
      this.flushUpdates();
      return;
    }

    if (!(this.cfg.runsInBrowser && window.requestAnimationFrame)) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = setTimeout(this.flushUpdates, 60 / 1000);
    } else {
      window.cancelAnimationFrame(this.updateTimeout);
      this.updateTimeout = window.requestAnimationFrame(this.flushUpdates);
    }
  }

  emit(name: string = '', ...args: any[]): void {
    if (this.cfg.debug) {
      const data: any[] = [...args];
      const time: number = new Date().getTime();
      const unsub: string = name === 'removeListener' ? data.shift() : '';
      const msg: string = `ezFlux | ${time} ${name} ${unsub}`;
      const color: string = colorMap[name.split('.')[0]] || 'gray';

      this.bus.history[`${time} ${msg}`] = { time, msg, data };

      if (this.cfg.runsInBrowser) {
        if (!this.cfg.logAppState) console.log(`%c${msg}`, `color:${color}`); // eslint-disable-line no-console
        else console.log(`%c${msg}`, `color:${color}`, '\n\n', ...data, '\n\n'); // eslint-disable-line no-console
      }
    }
    this.bus.emit.apply(this.bus, [name, ...args]);
  }
}
