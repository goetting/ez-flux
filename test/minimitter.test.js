import MiniMitter from '../src/minimitter.js';

describe('MiniMitter', () => {
  it('should spawn without blowing up', healthy);

  describe('on', () => {
    it('should add the given funtion to "events" under the given name', onEvents);
    it('should stack funciton in an array if both listen to the same event', onManyEvents);
    it('should emit "newListener" event before the event was subscribed', onTriggerNewListner);
    it('should return an Emitter instance', onReturnInst);
  });

  describe('off', () => {
    it('should unsubscribe a given function from "events"', offUnsubscribe);
    it('should emit "removeListener" after unsubscribtion', offEmitRemoveListner);
    it('should retun an Emitter instance', offReturnInst);
  });

  describe('once', () => {
    it('should subscribe an event', onceSubscribe);
    it('should unsubsribe an event after emission', onceUnsubscribe);
    it('should return an Emitter instance', onceReturnInst);

  });

  describe('emit', () => {
    it('should trigger all function which where subscribed', emitTriggerAll);
    it('should retun an Emitter instance', emitReutrnInst);
  });
});

const fn = () => {};
const fn1 = () => {};
const fn2 = () => {};

function healthy() {
  expect(new MiniMitter instanceof MiniMitter).toBeTruthy();
}

function onEvents() {
  const mini = new MiniMitter();

  mini.on('test', fn);
  expect(mini.events.test[0]).toEqual(fn);
}

function onManyEvents() {
  const mini = new MiniMitter();

  mini.on('test', fn1);
  mini.on('test', fn2);

  expect(mini.events.test[0]).toEqual(fn1);
  expect(mini.events.test[1]).toEqual(fn2);
}

function onTriggerNewListner() {
  const mini = new MiniMitter();

  mini.emit = (name) => {
    expect(name).toEqual('newListener');
    expect(mini.events.test).toBeFalsy();
    mini.emit = (name) => {
      expect(name).toEqual('test');
      expect(mini.events.test[0]).toEqual(fn);
    }
  }
  mini.on('test', fn);
}

function onReturnInst() {
  const mini = new MiniMitter();

  expect(mini.on() instanceof MiniMitter).toBeTruthy();
}

function offUnsubscribe() {
  const mini = new MiniMitter();

  mini.on('test', fn1);
  mini.on('test', fn2);

  expect(mini.events.test[0]).toEqual(fn1);
  expect(mini.events.test[1]).toEqual(fn2);

  mini.off('test', fn1);

  expect(mini.events.test.indexOf(fn1)).toEqual(-1);
  expect(mini.events.test.indexOf(fn2)).toEqual(0);

}

function offEmitRemoveListner() {
  const mini = new MiniMitter();
  let eventCalled = false;

  mini.on('test', fn);
  mini.on('removeListener', () => {
    expect(mini.events.test.length).toBeFalsy();
    eventCalled = true;
  });
  mini.off('test', fn);
  expect(eventCalled).toBeTruthy();
}

function offReturnInst() {
  const mini = new MiniMitter();

  expect(mini.off() instanceof MiniMitter).toBeTruthy();
}

function onceSubscribe() {
  const mini = new MiniMitter();
}

function onceUnsubscribe() {
  const mini = new MiniMitter();
}

function onceReturnInst() {
  const mini = new MiniMitter();

  expect(mini.once(name, fn) instanceof MiniMitter).toBeTruthy();
}

function emitTriggerAll() {
  const mini = new MiniMitter();
}

function emitReutrnInst() {
  const mini = new MiniMitter();

  expect(mini.emit() instanceof MiniMitter).toBeTruthy();
}
