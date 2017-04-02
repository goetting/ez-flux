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

  describe('state', () => {
    it('should be frozen', frozenState);
    it('should have frozen first dimension', frozenStateFirstDim);
    it('should stay frozen after an action was executed', frozenAfterAction);
    it('should stay frozen after reset', frozenAfterReset);
  });

  describe('actions', () => {
    it('should be triggered by actionTriggers with the appropriate data passed', actionsCallable);
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

 describe('resetStateScope', () => {
    it('should reset the state scope to its initial value', resetStateScope);
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

function frozenState() {
  const ez = new EZFlux(stateConfig);
  expect(Object.isFrozen(ez.state)).toBeTruthy();
}

function frozenStateFirstDim() {
  const ez = new EZFlux(stateConfig);
  Object.keys(ez.state).forEach(scope => expect(Object.isFrozen(scope)).toBeTruthy());
}

async function frozenAfterAction() {
  const ez = new EZFlux(stateConfig);
  await ez.actions.avengers.setHulk('green');
  Object.keys(ez.state).forEach(scope => expect(Object.isFrozen(scope)).toBeTruthy());
}

async function frozenAfterReset() {
  const ez = new EZFlux(stateConfig);
  await ez.actions.avengers.setHulk('green');
  ez.resetState();
  Object.keys(ez.state).forEach(scope => expect(Object.isFrozen(scope)).toBeTruthy());
}

async function actionsCallable() {
  const ez = new EZFlux(stateConfig);
  expect(ez.state.avengers.hulk).toEqual('normal');
  await ez.actions.avengers.setHulk('green');
  expect(ez.state.avengers.hulk).toEqual('green');
}

async function actionsCancel() {
  let changeFired = false;
  const ez = new EZFlux(stateConfig);
  const { avengers } = ez.state;
  const changeEventName = EZFlux.getEventNames('avengers', 'setData').change;
  const handler = () => { changeFired = true }

  ez.once(changeEventName, handler);
  await ez.actions.avengers.setData();
  expect(ez.state.avengers).toEqual(avengers);
  expect(changeFired).toBeFalsy();
  ez.removeListener(changeEventName, handler);
}

function stateChangeEvents(done) {
  const eventNames = EZFlux.getEventNames('avengers', 'setData');
  const ez = new EZFlux(stateConfig);
  let oneDone = false;
  const cb = () => { oneDone ? done() : oneDone = true; };

  ez.once(eventNames.change, cb);
  ez.once(eventNames.trigger, cb);
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
  beforeActionsStateConfig.avengers.beforeActions = (payload, stateChange, ezFlux, actionName) => {
    expect(payload).toEqual('green');
    expect(stateChange).toEqual(ez.state.avengers);
    expect(actionName).toEqual('setHulk');
    expect(ezFlux instanceof EZFlux);

    return { thor: 'hammered' };
  };
  const ez = new EZFlux(beforeActionsStateConfig);

  await ez.actions.avengers.setHulk('green');

  expect(ez.state.avengers.thor).toEqual('hammered');
}

async function afterAction() {
  const afterActionsStateConfig = EZFlux.cloneDeep(stateConfig);
  afterActionsStateConfig.avengers.afterActions = (payload, stateChange, ezFlux, actionName) => {
    expect(payload).toEqual('green');
    expect(stateChange).toEqual(Object.assign({}, ez.state.avengers, { hulk: 'green' }));
    expect(actionName).toEqual('setHulk');
    expect(ezFlux instanceof EZFlux);

    return { hulk: 'red' };
  };
  const ez = new EZFlux(afterActionsStateConfig);
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
  const defaultState = EZFlux.cloneDeep(ez.state);

  await ez.actions.avengers.setHulk('green');

  expect(ez.state).not.toEqual(defaultState);

  ez.resetState();

  expect(ez.state).toEqual(defaultState);
}

async function resetStateScope() {
  const ez = new EZFlux(stateConfig);
  const defaultState = EZFlux.cloneDeep(ez.state);

  await ez.actions.avengers.setHulk('green');

  expect(ez.state).not.toEqual(defaultState);
  ez.resetStateScope('avengers');

  expect(ez.state).toEqual(defaultState);
}