/* @flow */
import Flux from './flux';
import type { EZFluxConfig, StateConfig, StateGetters, ActionTriggers } from './flux';

export default class EZFlux {
  flux: Flux;
  config: EZFluxConfig = {
    debug: true,
    maxListeners: 10,
    logEventData: false,
    throttleUpdates: false,
    runsInBrowser: typeof process !== 'undefined' && process.title === 'browser',
  };
  state: StateGetters;
  actions: { [string]: ActionTriggers } = {};
  history: { [string]: { time: string, msg: string, data?: any } };
  on: (name: string, callback: any => any) => void;
  once: (name: string, callback: any => any) => void;
  emit: (name: string, data: any) => void;
  removeListener: (name: string, callback: any => any) => void;

  constructor(state: StateConfig, config: EZFluxConfig) {
    if (config) this.setConfig(config);

    const flux = new Flux(state, this.config);

    if (this.config.debug) this.flux = flux;

    this.actions = flux.actionTriggers;
    this.state = flux.stateGetters;
    this.history = flux.bus.history;
    this.on = (...args) => flux.bus.on(...args);
    this.once = (...args) => flux.bus.once(...args);
    this.emit = (...args) => flux.bus.emit(...args);
    this.removeListener = (...args) => flux.bus.removeListener(...args);
  }

  getConfig(): EZFluxConfig {
    return Object.assign({}, this.config);
  }

  setConfig(cfg: EZFluxConfig = {}): void {
    if (typeof cfg.throttleUpdates === 'boolean') this.config.throttleUpdates = cfg.throttleUpdates;
    if (typeof cfg.runsInBrowser === 'boolean') this.config.runsInBrowser = cfg.runsInBrowser;
    if (typeof cfg.maxListeners === 'number') this.config.maxListeners = cfg.maxListeners;
    if (typeof cfg.logAppState === 'boolean') this.config.logAppState = cfg.logAppState;
    if (typeof cfg.debug === 'boolean') this.config.debug = cfg.debug;
  }
}
