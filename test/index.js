/* eslint-disable no-unused-expressions, no-use-before-define */
import createStore, { plugins } from '../lib/index';

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
  const ez = getEZStore();

  ez.should.be.ok;
}

function gettersSettersOk() {
  const ez = getEZStore();
  const state = getTestState().state;

  Object
    .keys(state)
    .forEach((k) => {
      const descriptors = Object.getOwnPropertyDescriptor(ez, k);

      descriptors.get.should.be.a('function');
      descriptors.set.should.be.a('function');
    });
}

function gettersOk() {
  const ez = getEZStore();
  const state = getTestState().state;

  Object
    .keys(state)
    .forEach(k => ez[k].should.equal(state[k]));
}

function settersOk() {
  const ez = getEZStore();
  let eventFired = false;

  ez.$on('change', () => { eventFired = true; });
  ez.val1 = 11;
  ez.val1.should.be.equal(11);

  eventFired.should.be.ok;
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
  methodCalled.should.be.ok;
}

function methodBound() {
  let methodCalled = false;
  const ez = createStore({
    methods: {
      testMethod() {
        methodCalled = true;
        this.$assign.should.be.a('function');
        this.$emit.should.be.a('function');
      },
    },
  });

  ez.testMethod();
  methodCalled.should.be.ok;
}

function computedOk() {
  createStore({
    computed: {
      test: {
        get: () => 'success',
      },
    },
  }).test.should.equal('success');
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
  ez.test.should.equal('bar');
  ez.test = 'foo';
  ez.test.should.equal('baz');
}

function childOk() {
  const { parent } = makeParentChild();
  parent.child.foo.should.be.ok;
}

function childrensNotConfigurable() {
  const { parent } = makeParentChild();
  let error = null;

  try {
    parent.child = 'bar';
  } catch (ex) {
    error = ex;
  }

  error.should.be.ok;
  parent.child.foo.should.equal(true);
}

function emitChildChange() {
  const { parent } = makeParentChild();
  let emitSuccess = false;

  parent.$once('change', () => { emitSuccess = true; });

  parent.child.foo = false;
  parent.child.foo.should.not.be.ok;

  emitSuccess.should.be.ok;
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
  threwException.should.be.ok;
  store.foo.should.be.ok;
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

  store.foo.should.not.be.ok;
}

function assignOk() {
  const store = getEZStore();
  const testObj1 = { val1: 'assigntest1', val2: 'assigntest2' };
  const testObj2 = { val1: 'assigntest3', val3: 'assigntest4' };

  store.val1.should.equal(1);
  store.val2.should.equal(2);
  store.val3.should.equal(3);

  store.$assign(testObj1, testObj2);

  store.val1.should.equal('assigntest3');
  store.val2.should.equal('assigntest2');
  store.val3.should.equal('assigntest4');
}

function assignEmit() {
  const store = getEZStore();
  const testObj2 = { val1: 'assigntest3', val3: 'assigntest4' };
  let emissionSuccess = false;

  store.$once('change', () => { emissionSuccess = true; });
  store.$assign(testObj2);

  store.val1.should.equal('assigntest3');
  store.val2.should.equal(2);
  store.val3.should.equal('assigntest4');
  emissionSuccess.should.be.ok;
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

  store.name.should.equal('John Doe');
  store.$assign({ name: 'Foo Bar' });
  store.name.should.equal('Foo Bar');
}

function keysOk() {
  const { parent } = makeParentChild();
  const keys = parent.$keys();

  keys.length.should.equal(4);
  (keys.indexOf('child') > -1).should.be.ok;
  (keys.indexOf('bar') > -1).should.be.ok;
  (keys.indexOf('baz') > -1).should.be.ok;
  (keys.indexOf('two') > -1).should.be.ok;
}

function valuesOk() {
  const { parent } = makeParentChild();
  const values = parent.$values();

  values.length.should.equal(4);
}

function entriesOk() {
  const { parent } = makeParentChild();
  const entries = parent.$entries();

  entries.length.should.equal(4);
}

function copyOk() {
  const { parent } = makeParentChild();
  const copyEntries = Object.entries(parent.$copy());

  parent.$entries().should.be.deep.equal(copyEntries);
}

function onEvents() {
  const store = createStore({});

  store.$on('test', fn);
  store.$events.test[0].should.equal(fn);
}

function onManyEvents() {
  const store = createStore({});

  store.$on('test', fn1);
  store.$on('test', fn2);

  store.$events.test[0].should.equal(fn1);
  store.$events.test[1].should.equal(fn2);
}

function onTriggerNewListner() {
  const store = createStore({});

  store.$emit = (name) => {
    name.should.equal('newListener');
    (!!store.$events.test).should.not.be.ok;
    store.$emit = (name1) => {
      name1.should.equal('test');
      store.$events.test[0].should.equal(fn);
    };
  };
  store.$on('test', fn);
}

function onReturnInst() {
  const store = createStore({});

  store.$on().$assign.should.be.ok;
}

function offUnsubscribe() {
  const store = createStore({});

  store.$on('test', fn1);
  store.$on('test', fn2);

  store.$events.test[0].should.equal(fn1);
  store.$events.test[1].should.equal(fn2);

  store.$off('test', fn1);

  store.$events.test.indexOf(fn1).should.equal(-1);
  store.$events.test.indexOf(fn2).should.equal(0);
}

function offEmitRemoveListner() {
  const store = createStore({});
  let eventCalled = false;

  store.$on('test', fn);
  store.$on('removeListener', () => {
    store.$events.test.length.should.be.falsy;
    eventCalled = true;
  });
  store.$off('test', fn);
  eventCalled.should.be.ok;
}

function offReturnInst() {
  const store = createStore({});

  store.$off().$assign.should.be.ok;
}

function onceSubscribe() {
  const store = createStore({});
  let removed = false;

  store.$once('test', fn);
  store.$events.test[0].should.equal(fn);

  store.$on('removeListener', () => { removed = true; });

  store.$emit('test');
  (!!store.$events.test[0]).should.not.be.ok;
  removed.should.be.ok;
}

function onceUnsubscribe() {
  const store = createStore({});

  store.$once('test', fn);
  store.$events.test[0].should.equal(fn);
}

function onceReturnInst() {
  const store = createStore({});

  store.$once('test', fn).$assign.should.be.ok;
}

function emitTriggerAll() {
  let counter = 0;
  const store = createStore({});
  const testfn1 = () => counter++;
  const testfn2 = testfn1;

  store.$on('test', testfn1);
  store.$on('test', testfn2);

  store.$events.test[0].should.equal(testfn1);
  store.$events.test[1].should.equal(testfn2);

  store.$emit('test');

  counter.should.equal(2);
}

function emitReutrnInst() {
  const store = createStore({});

  store.$emit().$assign.should.be.ok;
}

function pluginCall() {
  let called = false;
  plugins.push(() => { called = true; });
  createStore({});
  plugins.length = 0;
  called.should.be.ok;
}

function pluginParams() {
  plugins.push((state, store, options) => {
    state.should.be.an('object');
    Object.keys(state).length.should.not.be.ok;
    store.$assign.should.be.a('function');
    store.test.should.be.a('function');
    Object.keys(options).length.should.be.equal(1);
    options.methods.test.should.be.a('function');
  });
  createStore({ methods: { test() {} } });
  plugins.length = 0;
}

function pluginBeforSeal() {
  plugins.push((state, store) => { store.$foo = true; });
  const store = createStore({});

  store.$foo.should.be.ok;
  Object.isSealed(store).should.be.ok;

  plugins.length = 0;
}

function pluginsCall() {
  plugins.push((state, store) => { store.$foo = true; });
  plugins.push((state, store) => { store.$bar = true; });
  const store = createStore({});

  store.$foo.should.be.ok;
  store.$bar.should.be.ok;

  plugins.length = 0;
}
