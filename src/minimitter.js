/* @flow */
export default class MiniMitter {
  events: { [string]: Function[] } = {};
  addListener = this.on;
  removeListener = this.off;

  emit(name: string = '', ...payload?: any[]): MiniMitter {
    if (this.events[name]) {
      for (let i = this.events[name].length; i--;) {
        const fn = this.events[name][i];
        fn(...payload);
        if (fn.once) this.off(name, fn);
      }
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
    fn.once = true;                                                                                   // eslint-disable-line no-param-reassign
    this.on(name, fn);
    return this;
  }

  off(name: string, fn: Function): MiniMitter {
    if (this.events[name]) {
      const i = this.events[name].indexOf(fn);

      if (i > -1) this.events[name].splice(i, 1);
      this.emit('removeListener', name, fn);
    }
    return this;
  }
}
