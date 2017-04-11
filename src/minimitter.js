/* @flow */
export default class MiniMitter {
  events: { [string]: Function[] } = {};
  addListener = this.on;
  removeListener = this.off;

  emit(name: string = '', ...payload?: any[]): MiniMitter {
    if (this.events[name]) {
      for (let i = this.events[name].length; i--;) this.events[name][i](...payload);
    }
    return this;
  }

  on(name: string, fn: Function): MiniMitter {
    this.emit('newListener', name, fn);
    if (!this.events[name]) this.events[name] = [fn];
    else this.events[name].push(fn);
    return this;
  }

  once(name: string, fn: Function): MiniMitter {
    const temp = (...args) => {
      fn(...args);
      this.off(name, fn);
    }
    Object.defineProperty(temp, 'name', { value: fn.name });
    this.on(name, temp);
    return this;
  }

  off(name: string, fn: Function): MiniMitter {
    if (!this.events[name]) return this;
    const i = this.events[name].indexOf(fn);

    if (i > -1) this.events[name].splice(i, 1);
    this.emit('removeListener', name, fn);
    return this;
  }
}
