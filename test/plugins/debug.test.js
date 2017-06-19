/* eslint-disable no-unused-expressions, no-use-before-define */
import { createStore, plugins } from '../../lib/index';
import createDebugger from '../../lib/plugins/debug';

describe('debug plugin', () => {
  afterEach(() => { plugins.length = 0; });

  describe('createDebugger', () => {
    it('should throw if first arg is not a function', noCB);
    it('should create a pluggable function', returnsFn);
  });
  describe('debug', () => {
    it('should throw an error if a given store has no name', noName);
    it('should not wrap native store methods', leaveNative);
    it('should wrap optional methods', logMethod);
    it('should subscribe to and log a change event', logChange);
    it('should log child events differently', logChild);
  });
});


function noCB() {
  let err = null;
  try {
    createDebugger();
  } catch (e) {
    err = e;
  }
  expect(err).toBeTruthy();
}

function returnsFn() {
  expect(typeof createDebugger(() => {})).toBe('function');
}

function noName() {
  let err = null;
  try {
    plugins.push(createDebugger(() => {}));
    const store = createStore({});

    store.$emit('change');
  } catch (e) {
    err = e;
  }
  expect(err).toBeTruthy();
}

function leaveNative() {
  let cbCount = 0;

  plugins.push(createDebugger((payload) => {
    if (payload.eventType === 'method called') cbCount++;
  }));

  const store = createStore({ name: 'store' });

  store.$reset();
  expect(cbCount).toBe(0);
}

function logMethod() {
  let cbCount = 0;

  plugins.push(createDebugger((payload) => {
    cbCount++;
    expect(payload).toMatchSnapshot();
  }));

  const store = createStore({ name: 'store', methods: { someMethod: () => {} } });

  store.someMethod();
  expect(cbCount).toBe(1);
}

function logChange() {
  let cbCount = 0;

  plugins.push(createDebugger((payload) => {
    cbCount++;
    expect(payload).toMatchSnapshot();
  }));

  const store = createStore({ name: 'store', state: { foo: 'bar' } });

  store.$assign({ foo: 'bar' });
  expect(cbCount).toBe(1);
}

function logChild() {
  let cbCount = 0;

  plugins.push(createDebugger((payload) => {
    cbCount++;
    expect(payload).toMatchSnapshot();
  }));

  const child = createStore({ name: 'child', state: { foo: 'bar' } });
  createStore({ name: 'parent', state: { bar: 'baz' }, children: { child } });

  child.$assign({ foo: 'baz' });
  expect(cbCount).toBe(2);
}

