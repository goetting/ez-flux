import EZFlux from '../src/index.js';
import storeData from './data/stores.js';

const tests = {
  'EZFlux': {
    'should spawn without blowing up': storeShouldSpawn,
    'should have state with stateType and state getters': storeShouldBeInTact,
    'Store': {
      'should generate Store if storeConfig is valid': shouldGenerateStore,
      'validateStoreData': {
        'should fail without reactions': storeFailsWithoutReactions,
        'should fail without state and stateTypes': storeFailsWithoutStates,
        'should fail if reactions is no function dictionary': storeFailsIfWrongReactions,
        'should generate stateTypes if only state is given': storeGeneratesStateTypes,
        'should fail if state types are undefined or function': storeFailsIfTypesUndefined,
        'should fail if given state value types and stateTypes dont match': storeFailsIfNoMach,
        'should generate state from stateTypes if no state was given': storeGeneratesState,
      },
    },
  },
};

function storeShouldSpawn() {
  expect(new EZFlux()).toBeTruthy();
}
function storeShouldBeInTact() {
  const ez = new EZFlux({ stores: storeData });
  const stateTypes= ez.state.avengers.getTypes();
  const storeState = ez.state.avengers.get();

  Object.keys(stateTypes).forEach((k) => {
    expect(stateTypes[k] === storeData.avengers.stateTypes[k]).toBeTruthy();
  });
  Object.keys(storeState).forEach((k) => {
    expect(storeState[k] === storeData.avengers.state[k]).toBeTruthy();
  });
}
function shouldGenerateStore() {
  const ez = new EZFlux({ stores: storeData });

  expect(ez.state.avengers && ez.state.avengers.get()).toBeTruthy();
}
function storeFailsWithoutReactions() {
  const invalidStoreData = {
    avengers: {
      state: storeData.avengers.state,
      stateTypes: storeData.avengers.stateTypes,
    }
  };
  const ez = new EZFlux({stores: invalidStoreData});
  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}
function storeFailsWithoutStates() {
  const invalidStoreData = { avengers: { reactions: storeData.avengers.reactions } };
  const ez = new EZFlux({ stores: invalidStoreData });

  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}
function storeFailsIfWrongReactions() {
  const invalidStoreData = {
    avengers: {
      state: storeData.avengers.state,
      stateTypes: storeData.avengers.stateTypes,
      reactions: { lol: 'zomg' },
    }
  };
  const ez = new EZFlux({ stores: invalidStoreData });

  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}
function storeGeneratesStateTypes() {
  const incompleteStoreData = {
    avengers: { state: storeData.avengers.state, reactions: storeData.avengers.reactions }
  };
  const ez = new EZFlux({ stores: incompleteStoreData });

  Object.keys(ez.state.avengers.getTypes()).forEach(key => {
    const generatedStateType = ez.state.avengers.getTypes()[key];
    const typeofState = typeof storeData.avengers.state[key];

    expect(generatedStateType === typeofState).toBeTruthy();
  });
}
function storeFailsIfTypesUndefined() {
  const invalidStoreData = {
    avengers: {
      state: Object.assign(
        {},
        storeData.avengers.state,
        { thor: () => {}, hulk: undefined }
      ),
      stateTypes: Object.assign(
        {},
        storeData.avengers.stateTypes,
        { thor: 'function', hulk: 'undefined' }
      ),
      reactions: storeData.avengers.reactions,
    }
  };
  const ez = new EZFlux({ stores: invalidStoreData });

  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}
function storeFailsIfNoMach() {
  const invalidStoreData = {
    avengers: {
      state: Object.assign({}, storeData.avengers.state, { mpf: true }),
      stateTypes: storeData.avengers.stateTypes,
      reactions: storeData.avengers.reactions,
    }
  };
  const ez = new EZFlux({ stores: invalidStoreData });

  expect(Object.keys(ez.state.get()).length).toBeFalsy();
}
function storeGeneratesState() {
  const invalidStoreData = {
    avengers: {
      stateTypes: storeData.avengers.stateTypes,
      reactions: storeData.avengers.reactions,
    }
  };
  const ez = new EZFlux({ stores: invalidStoreData });

  expect(ez.state.avengers.get().thor === '').toBeTruthy();
}
function compile(json) {
  for (let k in json) {
    if (typeof json[k] === 'function') it(k, json[k])
    else describe(k, ()=> compile(json[k]))
  };
}
compile(tests);