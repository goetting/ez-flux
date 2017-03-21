import EZFlux from '../src/index.js';
import testData from './data/data.js';

describe('EZFlux', () => {
  it('should spawn without blowing up', ezFluxShouldSpawn);

  describe('state scope addition', () => {
    it('should add state and state getters given healthy configuration', stateShouldBeInTact);
    it('should fail without actions', storeFailsWithoutReactions);
    it('should fail without state', storeFailsWithoutStates);
    it('should fail if actions is no function dictionary', storeFailsIfWrongReactions);
    it('should assign init state to current state scope values', assignInitState);
  });

  describe('action trigger creation', () => {
    it('should create an action trigger for each action passed in the constructor', actionCreate);
  });

  describe('actions', () => {
    it('should be triggered by actionTriggers with the appropriate data passed', actionsCallable);
    it('should fail to change state if setState was called falsy or !object', actionsWrongStateVal);
    it('should fire trigger event and state change event on statechange', stateChangeEvents);
    it('should return a promise', actionReturnsPromise);
    it('should set states asynchronously propperly', asyncActions);
  });

  describe('config', () => {
    it('should set config values while constructing', configConstruction);
    it('should set config values through setter', configSetter);
    it('should get config values', configGetter);
  });
});

const { stateConfig } = testData;

function ezFluxShouldSpawn() {
  expect(new EZFlux()).toBeTruthy();
}

function stateShouldBeInTact() {
  expect(new EZFlux(stateConfig).state.avengers).toEqual(stateConfig.avengers.values);
}

function storeFailsWithoutReactions() {
  let err = null;

  try { const ez = new EZFlux({ avengers: { values: stateConfig.avengers.values } }); }
  catch (e) { err = e; }
  expect(err).toBeTruthy();
}

function storeFailsWithoutStates() {
  let err = null;
  try { const ez = new EZFlux({ avengers: { actions: stateConfig.avengers.reactions } }); }
  catch (e) { err = e; }
  expect(err).toBeTruthy();
}

function storeFailsIfWrongReactions() {
  const invalidStoreData = {
    avengers: {
      values: stateConfig.avengers.values,
      actions: { lol: 'zomg' },
    }
  };
  let err = null;
  try { const ez = new EZFlux(invalidStoreData); }
  catch (e) { err = e; }
  expect(err).toBeTruthy();
}

function assignInitState() {
  const initialState = { avengers: { hulk: 'red', blackWiddow: 'cat suited' } };
  const expectedAvengers = Object.assign({}, stateConfig.avengers.values, initialState.avengers);
  const ez = new EZFlux(stateConfig, { initialState});

  expect(ez.state.avengers).toEqual(expectedAvengers);
}

function actionCreate() {
  const ez = new EZFlux(stateConfig);

  expect(ez.actions.avengers).toBeTruthy();

  Object.keys(ez.actions.avengers).forEach(triggerName => {
    expect(stateConfig.avengers.actions[triggerName]).toBeTruthy();
  });
}

async function actionsCallable() {
  const ez = new EZFlux(stateConfig);
  expect(ez.state.avengers.hulk).toEqual('normal');
  try { await ez.actions.avengers.setHulk('green'); }
  catch(e) { throw e; }
  expect(ez.state.avengers.hulk).toEqual('green');
}

async function actionsWrongStateVal() {
  const ez = new EZFlux(stateConfig)
  let err = null;

  try { await ez.actions.avengers.setData(); }
  catch(e) { err = e; }
  expect(err).toBeTruthy();
}

function stateChangeEvents(done) {
  const ez = new EZFlux(stateConfig);
  let oneDone = false;
  const cb = () => { oneDone ? done() : oneDone = true; };

  ez.once('change:state.avengers', cb);
  ez.once('trigger:action.avengers.setData', cb);
  ez.actions.avengers.setData({ hulk: 'green' });
}

function actionReturnsPromise() {
  const ez = new EZFlux(stateConfig);
  expect(typeof ez.actions.avengers.setData({ hulk: 'green' }).then).toEqual('function');
}

function asyncActions() {
  const ez = new EZFlux(stateConfig);
  let ms = 0;
  const interval = setInterval(() => { ms++ }, 1);
  expect(ez.state.avengers.ready).toEqual(false);
  return ez.actions.avengers.setAvengersReady()
    .then(() => {
      clearInterval(interval);
      expect(ez.state.avengers.ready).toEqual(true);
      expect(ms > 500).toBeTruthy();
    })
    .catch(e => {
      clearInterval(interval);
      expect(true).toBeFalsy();
    })
}

function configConstruction() {
  const ez = new EZFlux(stateConfig);

  expect(ez.cfg.debug).toEqual(false);
}

function configSetter() {
  const ez = new EZFlux(stateConfig);
  expect(ez.cfg.throttleUpdates).toEqual(false);
  ez.setConfig({ throttleUpdates: true });
  expect(ez.cfg.throttleUpdates).toEqual(true);
}

function configGetter() {
  const ez = new EZFlux(stateConfig);
  expect(ez.getConfig()).toEqual(ez.cfg);
}
