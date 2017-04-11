import EZFlux from '../lib/ez-flux.js';

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
    it('should set config values while constructing', configConstruction);
  });

  describe('resetState', () => {
    it('should restore the state to its initial value', resetState);
  });

  describe('resetStateScope', () => {
    it('should reset the state scope to its initial value', resetStateScope);
  });

  describe('plug', () => {
    it('should fail if first param is not a function or anon function', pluginFail);
    it('should bind scope to a given function and add it to plugins', plugin);
    it('should be able to add multiple plugins on construction', pluginOptions);
    it('should bind ezFlux to the plugin', bindScope);
  });
});

const timeout = async ms => new Promise(res => setTimeout(res, ms));
const getTestData = () => ({
  stateConfig: {
    deadScope: {
      values: {
        someVals: true,
      },
      actions: {
        nothing: () => 0,
      },
    },
    avengers: {
      values: { hulk: 'normal', ironMan: 'normal', thor: 'normal', ready: false, someArray: [] },
      actions: {
        setAvengersReady: async () => {
          await timeout(100);
          return { hulk: 'green', ironMan: 'suited up', thor: 'hammered', ready: true }
        },
        setHulk(data, values) {
          return { hulk: data, ready: values.ready && data.hulk === 'green' };
        },
        setData: (data, values) => data,
      },
    },
  },
});
const cloneDeep = (val) => {
  if (!val || typeof val !== 'object') return val;
  if (val instanceof Array) {
    const arrClone = [];

    for (let i = val.length; i--;) {
      arrClone[i] = cloneDeep(val[i]);
    }
    return arrClone;
  }
  const objClone = {};
  const keys = Object.keys(val);

  for (let i = keys.length; i--;) {
    const key = keys[i];

    if (Object.prototype.hasOwnProperty.call(val, key)) {
      objClone[key] = cloneDeep(val[key]);
    }
  }
  return objClone;
}



const { stateConfig } = getTestData();

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
  let canceled = false;
  const ez = new EZFlux(stateConfig);
  const { avengers } = ez.state;
  const cancelEventName = EZFlux.getEventNames('avengers', 'setData').canceled;
  const handler = () => { canceled = true }

  ez.once(cancelEventName, handler);
  await ez.actions.avengers.setData();
  expect(ez.state.avengers).toEqual(avengers);
  expect(canceled).toBeTruthy();
  ez.removeListener(cancelEventName, handler);
}

function stateChangeEvents(done) {
  const ez = new EZFlux(stateConfig);
  const eventNames = EZFlux.getEventNames('avengers', 'setData');
  let oneDone = false;
  const cb = () => { oneDone ? done() : oneDone = true; };

  ez.once(eventNames.change, cb);
  ez.once(eventNames.triggered, cb);
  ez.actions.avengers.setData({ hulk: 'green' });
}

function actionReturnsPromise() {
  const ez = new EZFlux(stateConfig);
  expect(typeof ez.actions.avengers.setData({ hulk: 'green' }).then).toEqual('function');
}

function asyncActions() {
  const ez = new EZFlux(getTestData().stateConfig);
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
      console.error(e);
      clearInterval(interval);
      expect(true).toBeFalsy();
    });
}

async function beforeAction() {
  const beforeActionsStateConfig = getTestData().stateConfig;
  beforeActionsStateConfig.avengers.beforeActions = (payload, stateChange, ezFlux, actionName) => {
    expect(payload).toEqual('green');
    expect(stateChange).toEqual(ez.state.avengers);
    expect(actionName).toEqual('setHulk');

    return { thor: 'hammered' };
  };
  const ez = new EZFlux(beforeActionsStateConfig);

  await ez.actions.avengers.setHulk('green');

  expect(ez.state.avengers.thor).toEqual('hammered');
}

async function afterAction() {
  const afterActionsStateConfig = getTestData().stateConfig;
  afterActionsStateConfig.avengers.afterActions = (payload, stateChange, ezFlux, actionName) => {
    expect(payload).toEqual('green');
    expect(stateChange).toEqual(Object.assign({}, ez.state.avengers, { hulk: 'green' }));
    expect(actionName).toEqual('setHulk');

    return { hulk: 'red' };
  };
  const ez = new EZFlux(afterActionsStateConfig);
  await ez.actions.avengers.setHulk('green');

  expect(ez.state.avengers.hulk).toEqual('red');
}

function configConstruction() {
  const ez = new EZFlux(stateConfig, { recordHistory: true });

  expect(ez.config.recordHistory).toEqual(true);
}

async function resetState() {
  const ez = new EZFlux(stateConfig);
  const defaultState = cloneDeep(ez.state);

  await ez.actions.avengers.setHulk('green');

  expect(ez.state).not.toEqual(defaultState);

  ez.resetState();

  expect(ez.state).toEqual(defaultState);
}

async function resetStateScope() {
  const ez = new EZFlux(stateConfig);
  const defaultState = cloneDeep(ez.state);

  await ez.actions.avengers.setHulk('green');

  expect(ez.state).not.toEqual(defaultState);
  ez.resetStateScope('avengers');

  expect(ez.state).toEqual(defaultState);
}

function pluginFail() {
  const ez = new EZFlux(stateConfig);
  let e1 = null;
  let e2 = null;

  try { ez.plug({}); }
  catch(err1) { e1 = err1 }
  try { ez.plug(function(){}); }
  catch(err2) { e2 = err2 }

  expect(e1).toBeTruthy;
  expect(e2).toBeTruthy;
}

function plugin() {
  const ez = new EZFlux(stateConfig);

  ez.plug(() => ({ test1: () => true }));
  expect(ez.plugins.test1()).toBeTruthy;
}

function pluginOptions() {
  const plugins = [
    function plugin1() {
      return { test1: () => true };
    },
    function plugin2() {
      return { test2: true };
    }
  ];
  const ez = new EZFlux(stateConfig, { plugins });
  expect(ez.plugins.test1()).toBeTruthy;
  expect(ez.plugins.test2).toBeTruthy;
}

function bindScope() {
  const ez = new EZFlux(stateConfig);

  ez.plug(function() {
    expect(this).toEqual(ez);
    return { test1: () => true };
  });
  expect(ez.plugins.test1()).toBeTruthy;
}