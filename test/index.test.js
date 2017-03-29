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
    it('should have the ez bound to it', actionsBound);
    it('should cancel action if setState was not an Object', actionsCancel);
    it('should fire trigger event and state change event on statechange', stateChangeEvents);
    it('should return a promise', actionReturnsPromise);
    it('should set states asynchronously propperly', asyncActions);
    it('should be called after "beforeAction" when given', beforeAction);
    it('should be called before "afterAction" when given', afterAction);
  });

  describe('config', () => {
    it('should set config values through setter', configSetter);
    it('should set config values while constructing', configConstruction);
    it('should get config values', configGetter);
  });

  describe('resetState', () => {
    it('should restore the state to its initial value', resetState);
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

async function actionsBound() {
  let ez = null;
  const datStateConfig = EZFlux.cloneDeep(stateConfig)
  datStateConfig.avengers.actions.datAction = function() {expect(this).toEqual(ez)};

  ez = new EZFlux(datStateConfig);

  ez.actions.avengers.datAction();
}


async function actionsCancel() {
  const ez = new EZFlux(stateConfig);
  const { avengers } = ez.state;
  const canceledEventName = EZFlux.getCanceledEventName('avengers', 'setData');
  let eventFired = false;

  ez.once(canceledEventName, () => { eventFired = true });
  await ez.actions.avengers.setData();
  expect(ez.state.avengers).toEqual(avengers);
  expect(eventFired).toBeTruthy();
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
      expect(ms > 50).toBeTruthy();
    })
    .catch(e => {
      clearInterval(interval);
      expect(true).toBeFalsy();
    });
}

async function beforeAction() {
  const beforeActionsStateConfig = EZFlux.cloneDeep(stateConfig);
  beforeActionsStateConfig.avengers.beforeActions = (payload, stateChange, actionName, ezFlux) => {
    expect(payload).toEqual('green');
    expect(stateChange).toEqual(ez.state.avengers);
    expect(actionName).toEqual('setHulk');
    expect(ezFlux instanceof EZFlux);
    expect(this instanceof EZFlux);

    return { teddy: true };
  };
  const ez = new EZFlux(beforeActionsStateConfig, { log: {events: true} });

  await ez.actions.avengers.setHulk('green');

  expect(ez.state.avengers.teddy).toEqual(true);
}

async function afterAction() {
  const afterActionsStateConfig = EZFlux.cloneDeep(stateConfig);
  afterActionsStateConfig.avengers.afterActions = (payload, stateChange, actionName, ezFlux) => {
    expect(payload).toEqual('green');
    expect(stateChange).toEqual(Object.assign({}, ez.state.avengers, { hulk: 'green' }));
    expect(actionName).toEqual('setHulk');
    expect(ezFlux instanceof EZFlux);
    expect(this instanceof EZFlux);

    return { hulk: 'red' };
  };
  const ez = new EZFlux(afterActionsStateConfig, { log: {events: true} });

  await ez.actions.avengers.setHulk('green');

  expect(ez.state.avengers.hulk).toEqual('red');
}


function configSetter() {
  const ez = new EZFlux(stateConfig);
  expect(ez.cfg.throttleUpdates).toEqual(false);
  ez.setConfig({ throttleUpdates: true });
  expect(ez.cfg.throttleUpdates).toEqual(true);
}

function configConstruction() {
  const ez = new EZFlux(stateConfig, { throttleUpdates: true });

  expect(ez.cfg.throttleUpdates).toEqual(true);
}

function configGetter() {
  const ez = new EZFlux(stateConfig);
  expect(ez.getConfig()).toEqual(ez.cfg);
}

async function resetState() {
  const ez = new EZFlux(stateConfig);
  const defaultState = ez.state;

  await ez.actions.avengers.setHulk('green');

  const mutatedState = ez.state;

  expect(mutatedState).not.toEqual(defaultState);

  ez.resetState();

  expect(ez.state).toEqual(defaultState);
}
