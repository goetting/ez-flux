/* eslint-disable no-unused-expressions, no-use-before-define */
import { createStore, plugins } from '../lib/index';

require('chai').should();

describe('store', () => {
  it('should spawn without blowing up', spawns);

  describe('options', () => {
    describe('state', () => {
      it('should include getters and setters of the state options', gettersSettersOk);
      it('should the correct state values', gettersOk);
      it('should emit a state event on setting a values', settersOk);
    });

    describe('methods', () => {
      it('should be added to the top level of the store', methodAdded);
      it('should be bound the namespace of the store', methodBound);
      it('should throw an exception if a key on the state is already taken', keyTaken);
    });

    describe('computed', () => {
      it('should be added to the top level of the store', computedOk);
      it('should bind scope to setter if given', computedBound);
    });

    describe('children', () => {
      it('should add children', childOk);
      it('should not allow configuration of children', childrensNotConfigurable);
      it('should emit change if a child changes', emitChildChange);
    });

    describe('immutable', () => {
      it('should ignore directly assigned values', immutableDirectly);
      it('should make $assign available only in methods', assignOnlyInMethods);
    });
  });

  describe('store methods', () => {
    describe('$assign', () => {
      it('should add any values from any number of objects to state', assignOk);
      it('should emit change after assigning to state', assignEmit);
      it('should use computed setters propperly', assignComputed);
    });

    describe('$keys', () => {
      it('should return an array of state keys, including computed and children', keysOk);
    });

    describe('$values', () => {
      it('should return an array of state values, including computed and children', valuesOk);
    });

    describe('$entries', () => {
      it('should return an array of state key value, including computed and children', entriesOk);
    });

    describe('$copy', () => {
      it('should return a shallow copy of the state', copyOk);
    });
  });

  describe('Store Emitter', () => {
    describe('on', () => {
      it('should add the given funtion to "$events" under the given name', onEvents);
      it('should stack funciton in an array if both listen to the same event', onManyEvents);
      it('should emit "newListener" event before the event was subscribed', onTriggerNewListner);
      it('should return the store', onReturnInst);
    });

    describe('off', () => {
      it('should unsubscribe a given function from "$events"', offUnsubscribe);
      it('should emit "removeListener" after unsubscribtion', offEmitRemoveListner);
      it('should retun the store', offReturnInst);
    });

    describe('once', () => {
      it('should subscribe an event', onceSubscribe);
      it('should unsubsribe an event after emission', onceUnsubscribe);
      it('should return the store', onceReturnInst);
    });

    describe('emit', () => {
      it('should trigger all function which where subscribed', emitTriggerAll);
      it('should retun the store', emitReutrnInst);
    });
  });

  describe('Plugins', () => {
    it('should be called on store creation', pluginCall);
    it('should receive state, store and options', pluginParams);
    it('should be called before the store and state are sealed', pluginBeforSeal);
    it('should execute all plugins given to the plug function', pluginsCall);
  });
});


const fn = () => {};
const fn1 = () => {};
const fn2 = () => {};
const getTestState = () => ({ state: { val1: 1, val2: 2, val3: 3 } });
const getEZStore = () => createStore(getTestState());
const makeParentChild = () => {
  const child = createStore({ state: { foo: true } });

  return {
    child,
    parent: createStore({
      state: { bar: 'bar' },
      children: { child },
      computed: {
        baz: {
          get: () => true,
          set: () => undefined,
        },
        two: {
          set: () => undefined,
        },
      },
      methods: {
        testMethod() {},
      },
    }),
  };
};

function spawns() {
  expect(createStore()).toBeTruthy();
}

function gettersSettersOk() {
  const ez = getEZStore();
  const state = getTestState().state;

  Object
    .keys(state)
    .forEach((k) => {
      const descriptors = Object.getOwnPropertyDescriptor(ez, k);

      expect(typeof descriptors.get).toBe('function');
      expect(typeof descriptors.set).toBe('function');
    });
}

function gettersOk() {
  const ez = getEZStore();
  const state = getTestState().state;

  Object
    .keys(state)
    .forEach(k => expect(ez[k]).toBe(state[k]));
}

function settersOk() {
  const ez = getEZStore();
  let eventFired = false;

  ez.$on('change', () => { eventFired = true; });
  ez.val1 = 11;

  expect(ez.val1).toBe(11);
  expect(eventFired).toBe(true);
}

function methodAdded() {
  let methodCalled = false;
  const ez = createStore({
    methods: {
      testMethod() {
        methodCalled = true;
      },
    },
  });

  ez.testMethod();
  expect(methodCalled).toBe(true);
}

function methodBound() {
  let methodCalled = false;
  const ez = createStore({
    methods: {
      testMethod() {
        methodCalled = true;
        expect(typeof this.$assign).toBe('function');
        expect(typeof this.$emit).toBe('function');
      },
    },
  });

  ez.testMethod();

  expect(methodCalled).toBe(true);
}

function keyTaken() {
  let threw = false;

  try {
    createStore({
      state: { someVal: true },
      methods: { someVal: () => {} },
    });
  } catch (e) {
    threw = true;
  }

  expect(threw).toBe(true);
}

function computedOk() {
  const store = createStore({
    computed: {
      test: {
        get: () => 'success',
      },
    },
  });
  expect(store.test).toBe('success');
}

function computedBound() {
  const ez = createStore({
    state: {
      foo: 'bar',
    },
    computed: {
      test: {
        get() { return this.foo; },
        set() { this.foo = 'baz'; },
      },
    },
  });
  expect(ez.test).toBe('bar');
  ez.test = 'foo';
  expect(ez.test).toBe('baz');
}

function childOk() {
  const { parent } = makeParentChild();
  expect(parent.child.foo).toBeTruthy();
}

function childrensNotConfigurable() {
  const { parent } = makeParentChild();
  let error = null;

  try {
    parent.child = 'bar';
  } catch (ex) {
    error = ex;
  }

  expect(error).toBeTruthy();
  expect(parent.child.foo).toBe(true);
}

function emitChildChange() {
  const { parent } = makeParentChild();
  let emitSuccess = false;

  parent.$once('change', () => { emitSuccess = true; });

  parent.child.foo = false;

  expect(parent.child.foo).toBe(false);
  expect(emitSuccess).toBe(true);
}

function immutableDirectly() {
  const store = createStore({
    state: { foo: true },
    immutable: true,
  });
  let threwException = false;

  try {
    store.foo = false;
  } catch (e) {
    threwException = true;
  }
  expect(threwException).toBeTruthy();
  expect(store.foo).toBe(true);
}

function assignOnlyInMethods() {
  const store = createStore({
    state: { foo: true },
    methods: {
      mutate() {
        this.$assign({ foo: false });
      },
    },
    immutable: true,
  });

  store.mutate();

  expect(store.foo).toBe(false);
}

function assignOk() {
  const store = getEZStore();
  const testObj1 = { val1: 'assigntest1', val2: 'assigntest2' };
  const testObj2 = { val1: 'assigntest3', val3: 'assigntest4' };

  expect(store.val1).toBe(1);
  expect(store.val2).toBe(2);
  expect(store.val3).toBe(3);

  store.$assign(testObj1, testObj2);

  expect(store.val1).toBe('assigntest3');
  expect(store.val2).toBe('assigntest2');
  expect(store.val3).toBe('assigntest4');
}

function assignEmit() {
  const store = getEZStore();
  const testObj2 = { val1: 'assigntest3', val3: 'assigntest4' };
  let emissionSuccess = false;

  store.$once('change', () => { emissionSuccess = true; });
  store.$assign(testObj2);

  expect(store.val1).toBe('assigntest3');
  expect(store.val2).toBe(2);
  expect(store.val3).toBe('assigntest4');

  expect(emissionSuccess).toBeTruthy();
}

function assignComputed() {
  const store = createStore({
    state: {
      firstName: 'John',
      lastName: 'Doe',
    },
    computed: {
      name: {
        get() {
          return `${this.firstName} ${this.lastName}`;
        },
        set(name) {
          const [firstName, lastName] = name.split(' ');

          this.$assign({ firstName, lastName });
        },
      },
    },
  });

  expect(store.name).toBe('John Doe');
  store.$assign({ name: 'Foo Bar' });
  expect(store.name).toBe('Foo Bar');
}

function keysOk() {
  const { parent } = makeParentChild();
  const keys = parent.$keys();

  expect(keys.length).toBe(4);
  expect(keys.indexOf('child') > -1).toBeTruthy();
  expect(keys.indexOf('bar') > -1).toBeTruthy();
  expect(keys.indexOf('baz') > -1).toBeTruthy();
  expect(keys.indexOf('two') > -1).toBeTruthy();
}

function valuesOk() {
  const { parent } = makeParentChild();
  const values = parent.$values();

  expect(values.length).toBe(4);
}

function entriesOk() {
  const { parent } = makeParentChild();
  const entries = parent.$entries();

  expect(entries.length).toBe(4);
}

function copyOk() {
  const { parent } = makeParentChild();
  const copyEntries = Object.entries(parent.$copy());

  expect(JSON.stringify(parent.$entries())).toBe(JSON.stringify(copyEntries));
}

function onEvents() {
  const store = createStore({});

  store.$on('test', fn);
  expect(store.$events.test[0]).toBe(fn);
}

function onManyEvents() {
  const store = createStore({});

  store.$on('test', fn1);
  store.$on('test', fn2);

  expect(store.$events.test[0]).toBe(fn1);
  expect(store.$events.test[1]).toBe(fn2);
}

function onTriggerNewListner() {
  const store = createStore({});

  store.$emit = (name) => {
    expect(name).toBe('newListener');
    expect(!!store.$events.test).toBe(false);
    store.$emit = (name1) => {
      expect(name1).toBe('test');
      expect(store.$events.test[0]).toBe(fn);
    };
  };
  store.$on('test', fn);
}

function onReturnInst() {
  const store = createStore({});

  expect(store.$on().$assign).toBeTruthy();
}

function offUnsubscribe() {
  const store = createStore({});

  store.$on('test', fn1);
  store.$on('test', fn2);

  expect(store.$events.test[0]).toBe(fn1);
  expect(store.$events.test[1]).toBe(fn2);

  store.$off('test', fn1);

  expect(store.$events.test.indexOf(fn1)).toBe(-1);
  expect(store.$events.test.indexOf(fn2)).toBe(0);
}

function offEmitRemoveListner() {
  const store = createStore({});
  let eventCalled = false;

  store.$on('test', fn);
  store.$on('removeListener', () => {
    expect(store.$events.test.length).toBe(0);
    eventCalled = true;
  });
  store.$off('test', fn);
  expect(eventCalled).toBe(true);
}

function offReturnInst() {
  const store = createStore({});

  expect(store.$off().$assign).toBeTruthy();
}

function onceSubscribe() {
  const store = createStore({});
  let removed = false;

  store.$once('test', fn);
  expect(store.$events.test[0]).toBe(fn);

  store.$on('removeListener', () => { removed = true; });

  store.$emit('test');

  expect(!!store.$events.test[0]).toBe(false);
  expect(removed).toBe(true);
}

function onceUnsubscribe() {
  const store = createStore({});

  store.$once('test', fn);
  expect(store.$events.test[0]).toBe(fn);
}

function onceReturnInst() {
  const store = createStore({});

  expect(store.$once('test', fn).$assign).toBeTruthy();
}

function emitTriggerAll() {
  let counter = 0;
  const store = createStore({});
  const testfn1 = () => counter++;
  const testfn2 = testfn1;

  store.$on('test', testfn1);
  store.$on('test', testfn2);

  expect(store.$events.test[0]).toBe(testfn1);
  expect(store.$events.test[1]).toBe(testfn2);

  store.$emit('test');

  expect(counter).toBe(2);
}

function emitReutrnInst() {
  const store = createStore({});

  expect(store.$emit().$assign).toBeTruthy();
}

function pluginCall() {
  let called = false;
  plugins.push(() => { called = true; });
  createStore({});
  plugins.length = 0;

  expect(called).toBe(true);
}

function pluginParams() {
  plugins.push((state, store, options) => {
    expect(typeof state).toBe('object');
    expect(typeof store.$assign).toBe('function');
    expect(typeof store.test).toBe('function');
    expect(Object.keys(options).length).toBe(1);
    expect(typeof options.methods.test).toBe('function');
  });
  createStore({ methods: { test() {} } });
  plugins.length = 0;
}

function pluginBeforSeal() {
  plugins.push((state, store) => { store.$foo = true; });
  const store = createStore({});

  expect(store.$foo).toBe(true);
  expect(Object.isSealed(store)).toBe(true);

  plugins.length = 0;
}

function pluginsCall() {
  plugins.push((state, store) => { store.$foo = true; });
  plugins.push((state, store) => { store.$bar = true; });
  const store = createStore({});

  expect(store.$foo).toBe(true);
  expect(store.$bar).toBe(true);

  plugins.length = 0;
}
