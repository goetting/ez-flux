/* @flow */
import Flux from './flux';
import type { EZFluxConfig, Logger, StoreConfigs, StateGetters } from './flux';

export default class EZFlux {
  flux: Flux;
  config: EZFluxConfig;
  logger: Logger;
  state: StateGetters;
  actions: { [string]: any => any };
  history: { [string]: { time: string, msg: string, data?: any } };
  on: (name: string, callback: any => any) => void;
  once: (name: string, callback: any => any) => void;
  emit: (name: string, data: any) => void;
  removeListener: (name: string, callback: any => any) => void;

  constructor({ stores, config }: { stores: StoreConfigs, config: EZFluxConfig } = {}) {
    this.config = {
      debugMode: true,
      maxListeners: 10,
      logEventData: false,
      bufferActions: false,
      throttleUpdates: false,
      runsInBrowser: typeof process !== 'undefined' && process.title === 'browser',
    };
    if (config) this.setConfig(config);
    this.logger = {
      /* eslint-disable no-console */
      dir: (...args) => { if (this.config.debugMode) console.dir(...args); },
      log: (...args) => { if (this.config.debugMode) console.log(...args); },
      error: (...args) => { if (this.config.debugMode) console.error(...args); },
      trace: (...args) => { if (this.config.debugMode) console.trace(...args); },
    };
    this.flux = new Flux(this.config, stores, this.logger);
    this.actions = this.flux.actions;
    this.history = this.flux.bus.history;
    this.state = this.flux.stateGetters;
    this.on = (...args) => this.flux.bus.on(...args);
    this.once = (...args) => this.flux.bus.once(...args);
    this.emit = (...args) => this.flux.bus.emit(...args);
    this.removeListener = (...args) => this.flux.bus.removeListener(...args);
  }

  getConfig(): EZFluxConfig {
    return Object.assign({}, this.config);
  }

  setConfig(cfg: EZFluxConfig = {}): void {
    if (typeof cfg.throttleUpdates === 'boolean') this.config.throttleUpdates = cfg.throttleUpdates;
    if (typeof cfg.runsInBrowser === 'boolean') this.config.runsInBrowser = cfg.runsInBrowser;
    if (typeof cfg.bufferActions === 'boolean') this.config.bufferActions = cfg.bufferActions;
    if (typeof cfg.maxListeners === 'number') this.config.maxListeners = cfg.maxListeners;
    if (typeof cfg.logAppState === 'boolean') this.config.logAppState = cfg.logAppState;
    if (typeof cfg.debugMode === 'boolean') this.config.debugMode = cfg.debugMode;
  }
}
