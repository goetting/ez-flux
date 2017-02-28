import EZFlux from '../src/index.js';
import testData from './data/data.js';

const tests = {
  'EZFlux': {
    'should spawn without blowing up': ezFluxShouldSpawn,
    'State Scope Addition': {
      'should add state and state getters given healthy configuration': storeShouldBeInTact,
      'validateStoreData': {
        'should fail without actions': storeFailsWithoutReactions,
        'should fail without state': storeFailsWithoutStates,
        'should fail if actions is no function dictionary': storeFailsIfWrongReactions,
      },
    },
  },
};

const { stateConfig } = testData;

function ezFluxShouldSpawn() {
  expect(new EZFlux()).toBeTruthy();
}

function storeShouldBeInTact() {
  const ez = new EZFlux(stateConfig);
  const stateScope = ez.state.avengers.get();

  Object.keys(stateScope).forEach((k) => {
    expect(stateScope[k] === stateConfig.avengers.state[k]).toBeTruthy();
  });
}

function storeFailsWithoutReactions() {
  const ez = new EZFlux({ avengers: { state: stateConfig.avengers.state } });

  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}

function storeFailsWithoutStates() {
  const ez = new EZFlux({ avengers: { actions: stateConfig.avengers.reactions } });

  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}

function storeFailsIfWrongReactions() {
  const invalidStoreData = {
    avengers: {
      state: stateConfig.avengers.state,
      actions: { lol: 'zomg' },
    }
  };
  const ez = new EZFlux(invalidStoreData);

  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}

function compile(json) {
  for (let k in json) {
    if (typeof json[k] === 'function') it(k, json[k])
    else describe(k, ()=> compile(json[k]))
  };
}
compile(tests);