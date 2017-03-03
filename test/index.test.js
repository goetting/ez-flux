import EZFlux from '../src/index.js';
import testData from './data/data.js';

const tests = {
  'EZFlux': {
    'should spawn without blowing up': ezFluxShouldSpawn,
    'state scope addition': {
      'should add state and state getters given healthy configuration': storeShouldBeInTact,
      'should fail without actions': () => muteConsole(storeFailsWithoutReactions),
      'should fail without state': () => muteConsole(storeFailsWithoutStates),
      'should fail if actions is no function dictionary': () => muteConsole(storeFailsIfWrongReactions),
    },
    'action trigger creation': {
      'should create an action trigger for each action passed in the constructor': actionCreate,
    },
    'actions': {
      'should be triggered by actionTriggers with the appropriate data passed': actionsCallable,
      'should fail to change state if setState was called falsy or !object': () => muteConsole(actionsWrongStateVal),
      'should fire trigger event and state change event on statechange': stateChangeEvents,
    },
    'config': {
      'should set config values while constructing': configConstruction,
      'should set config values through setter': configSetter,
    }
  },
};

const { stateConfig } = testData;

function ezFluxShouldSpawn() {
  expect(new EZFlux()).toBeTruthy();
}

function storeShouldBeInTact() {
  const ez = new EZFlux(stateConfig);
  const stateScope = ez.state.avengers;

  Object.keys(stateConfig.avengers.state).forEach((k) => {
    expect(stateScope[k] === stateConfig.avengers.state[k]).toBeTruthy();
  });
}

function storeFailsWithoutReactions() {
  const ez = new EZFlux({ avengers: { state: stateConfig.avengers.state } });

  expect(Object.keys(ez.state).length).toBeFalsy();
}

function storeFailsWithoutStates() {
  const ez = new EZFlux({ avengers: { actions: stateConfig.avengers.reactions } });

  expect(Object.keys(ez.state).length).toBeFalsy();
}

function storeFailsIfWrongReactions() {
  const invalidStoreData = {
    avengers: {
      state: stateConfig.avengers.state,
      actions: { lol: 'zomg' },
    }
  };
  const ez = new EZFlux(invalidStoreData);

  expect(Object.keys(ez.state).length).toBeFalsy();
}

function actionCreate() {
  const ez = new EZFlux(stateConfig);

  expect(ez.actions.avengers).toBeTruthy();

  Object.keys(ez.actions.avengers).forEach(triggerName => {
    expect(stateConfig.avengers.actions[triggerName]).toBeTruthy();
  });
}

function actionsCallable() {
  const ez = new EZFlux(stateConfig);

  expect(ez.state.avengers.hulk).toEqual('normal');

  ez.actions.avengers.setHulk('green');

  expect(ez.state.avengers.hulk).toEqual('green');
}

function actionsWrongStateVal() {
  const ez = new EZFlux(stateConfig);

  expect(ez.state.avengers.hulk).toEqual('normal');

  ez.actions.avengers.setData();

  expect(ez.state.avengers.hulk).toEqual('normal');
}

function stateChangeEvents() {
  const ez = new EZFlux(stateConfig);

  return new Promise(res => {
    let oneDone = false;
    const cb = () => { oneDone ? res() : oneDone = true; };

    ez.once('state.change.avengers', (data) => {
      expect(data.avengers.hulk).toEqual('green');
      cb();
    });

    ez.once('action.avengers.setData', () => {
      expect(ez.state.avengers.hulk).toEqual('green');
      cb();
    });

    ez.actions.avengers.setData({ hulk: 'green' });
  });
}

function configConstruction() {
  const ez = new EZFlux(stateConfig, { debug: false });

  expect(ez.cfg.debug).toEqual(false);
}

function configSetter() {
  const ez = new EZFlux(stateConfig);
  expect(ez.cfg.debug).toEqual(true);
  ez.setConfig({ debug: false });
  expect(ez.cfg.debug).toEqual(false);
}

function muteConsole(test) {
  const backup = console;
  console = { error: () => {}, warn: () => {}, log: () => {}, dir: () => {} };
  const result = test();
  console = backup;
  return result;
}
function compile(json) {
  for (let k in json) {
    if (typeof json[k] === 'function') it(k, json[k])
    else describe(k, ()=> compile(json[k]))
  };
}
compile(tests);