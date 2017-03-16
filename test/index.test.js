import EZFlux from '../src/index.js';
import testData from './data/data.js';

const tests = {
  'EZFlux': {
    'should spawn without blowing up': ezFluxShouldSpawn,
    'state scope addition': {
      'should add state and state getters given healthy configuration': stateShouldBeInTact,
      'should fail without actions': storeFailsWithoutReactions,
      'should fail without state': storeFailsWithoutStates,
      'should fail if actions is no function dictionary': storeFailsIfWrongReactions,
    },
    'action trigger creation': {
      'should create an action trigger for each action passed in the constructor': actionCreate,
    },
    'actions': {
      'should be triggered by actionTriggers with the appropriate data passed': actionsCallable,
      'should fail to change state if setState was called falsy or !object': actionsWrongStateVal,
      'should fire trigger event and state change event on statechange': stateChangeEvents,
      'should return a promise': actionReturnsPromise,
      'should set states asynchronously propperly': asyncActions,
    },
    'config': {
      'should set config values while constructing': configConstruction,
      'should set config values through setter': configSetter,
      'should get config values': configGetter,
    }
  },
};

const { stateConfig } = testData;
const dedebug = { debug: false };

function ezFluxShouldSpawn() {
  expect(new EZFlux()).toBeTruthy();
}

function stateShouldBeInTact() {
  expect(new EZFlux(stateConfig, dedebug).state.avengers).toEqual(stateConfig.avengers.values);
}

function storeFailsWithoutReactions() {
  let err = null;

  try { const ez = new EZFlux({ avengers: { values: stateConfig.avengers.values } }, dedebug); }
  catch (e) { err = e; }
  expect(err).toBeTruthy();
}

function storeFailsWithoutStates() {
  let err = null;
  try { const ez = new EZFlux({ avengers: { actions: stateConfig.avengers.reactions } }, dedebug); }
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
  try { const ez = new EZFlux(invalidStoreData, dedebug); }
  catch (e) { err = e; }
  expect(err).toBeTruthy();
}

function actionCreate() {
  const ez = new EZFlux(stateConfig, dedebug);

  expect(ez.actions.avengers).toBeTruthy();

  Object.keys(ez.actions.avengers).forEach(triggerName => {
    expect(stateConfig.avengers.actions[triggerName]).toBeTruthy();
  });
}

async function actionsCallable() {
  const ez = new EZFlux(stateConfig, dedebug);
  expect(ez.state.avengers.hulk).toEqual('normal');
  try { await ez.actions.avengers.setHulk('green'); }
  catch(e) { throw e; }
  expect(ez.state.avengers.hulk).toEqual('green');
}

async function actionsWrongStateVal() {
  const ez = new EZFlux(stateConfig, dedebug)
  let err = null;

  try { await ez.actions.avengers.setData(); }
  catch(e) { err = e; }
  expect(err).toBeTruthy();
}

function stateChangeEvents(done) {
  const ez = new EZFlux(stateConfig, dedebug);
  let oneDone = false;
  const cb = () => { oneDone ? done() : oneDone = true; };

  ez.once('change:state.avengers', cb);
  ez.once('trigger:action.avengers.setData', cb);
  ez.actions.avengers.setData({ hulk: 'green' });
}

function actionReturnsPromise() {
  const ez = new EZFlux(stateConfig, dedebug);
  expect(typeof ez.actions.avengers.setData({ hulk: 'green' }).then).toEqual('function');
}

function asyncActions() {
  const ez = new EZFlux(stateConfig, dedebug);
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
  const ez = new EZFlux(stateConfig, dedebug);

  expect(ez.cfg.debug).toEqual(false);
}

function configSetter() {
  const ez = new EZFlux(stateConfig, dedebug);
  expect(ez.cfg.throttleUpdates).toEqual(false);
  ez.setConfig({ throttleUpdates: true });
  expect(ez.cfg.throttleUpdates).toEqual(true);
}
function configGetter() {
  const ez = new EZFlux(stateConfig, dedebug);
  expect(ez.getConfig()).toEqual(ez.cfg);
}

function compile(json) {
  for (let k in json) {
    if (typeof json[k] === 'function') it(k, json[k])
    else describe(k, ()=> compile(json[k]))
  };
}
compile(tests);