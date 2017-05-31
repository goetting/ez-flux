# ezFlux


ezFlux is a simple, tiny and focused [flux](https://www.youtube.com/watch?list=PLb0IAmt7-GS188xDYE-u1ShQmFFGbrk0v&time_continue=621&v=nYkdrAPrdcw) implementation.  

At its center is the application state, guarded by one or more stores.  
A store implements a minimal event emitter that may be subscribed to.  
Stores may be nested, seamlessly reporting children changing.  

The resulting benefits are immense:

- minimal file size: **1kb** gzipped, no dependencies
- minimal brain load: no reducers, no dispatchers
- minimal boiler plate: no unnecessary ceremony

With improved run time, design time _and_ decreased package size, _ezFlux_ turns state management into a truely elegant, easy and fun experience!

-   [Install](#install)
-   [Usage](#usage)
    -   [Getting Started](#getting-started)
    -   [Immutable Store](#immutable-state)
    -   [Computed State](#computed-state)
    -   [Store Methods](#store-methods)
    -   [Store Nesting](#store-nesting)
-   [Using Plugins](#using-plugins)
-   [API Documentation](#api-documentation)
    -   [createStore](#createstore)
    -   [Plugins](#plugins)
-   [Contributing](#contributing)

# Install
(WIP - NOT YET PUBLISHED)

[NPM](https://npmjs.com):

```sh
$ npm install ez-flux --save
```

[Yarn](https://yarnpkg.com/):

```sh
$ yarn add ez-flux
```

# Usage

### Getting Started

A store saveguards a given state with getters/setter.  
If a new value is directly assigned to the store, it will emit a change event.  
This behaviour works great in small encapsulations.  
Stores are sealed by default.

```JS
import { createStore } from 'ez-flux';

const user = createStore({
  state: { name: 'John Doe' },
});

user.$on('change', () => console.log(user.name));

user.name = 'Jane Doe';

// console outs 'Jane Doe';
```

To assign multiple values without spamming events, $assign may be used.

```JS
import { createStore } from 'ez-flux';

const user = createStore({
  state: { firstName: 'John', lastName: 'Doe' },
});

user.$on('change', () => console.log(user.firstName, user.lastName));

user.$assign({ firstName: 'Jane', lastName: 'Doeh'});

// console outs 'Jane', 'Doeh';
```

### Immutable Store

Direct value assignment may be deactivated through the _immutable_ option.  
$assign will become the only way to mutate the state of a store.  
This convention will result in better maintainability on large scale.  


```JS
import { createStore } from 'ez-flux';

const user = createStore({
  state: { name: 'John Doe' },
  immutable: true,
});

user.$on('change', () => console.log(user.name));

user.name = 'Jane Doe';
// throws error;

user.$assign({ name: 'Jane Doe' });

// console outs 'Jane Doe';
```

### Computed State

You may define getters and/or setters directly.

```JS
import { createStore } from 'ez-flux';

const user = createStore({
  state: {
    firstName: 'John',
    lastName: 'Doe'
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

user.$on('change', () => console.log(user.name));

user.$assign({ name: 'Jane Doe' });

// console outs 'Jane Doe';
```

### Store Methods

While _methods_ do seem alot like actions, there is no obligation to use $assign within them.

```JS
import { createStore } from 'ez-flux';

const user = createStore({
  state: {
    name: 'John Doe',
  },
  methods: {
    safelySetName(name) {
      if (typeof name === 'string') this.$assign({ name });
    },
  },
});

user.$on('change', () => console.log(user.name));

user.safelySetName('Jane Doe');

// console outs 'Jane Doe';
```

### Store Nesting

Stores may be nested useing the _children_ option.  
If a child changes, both the child and the parent will emit a change.  
If the parent changes, only it will emit a change.  

```JS
import { createStore } from 'ez-flux';

const user = createStore({
  state: { name: 'John Doe' },
});
const session = createStore({
  state: { sessionId: 0 },
  children: { user },
});

session.$on('change', () => console.log('session changed'));
user.$on('change', () => console.log('user changed'));

session.$assign({ sessionId: 1 });

// console outs 'session changed'

// You may access the user store through session as well
session.user.$assign({ name: 'Jane Doe' });

// console outs 'user changed'
// console outs 'session changed'
```

# Plugins

[Plugins](#plugins) are an array of functions which is directly exported for you to edit.  
They will be looped and execuded _after_ options have been handled and _before_ store and state are sealed.  
As a result, plugins may extend or limit the scope of the created store.  

[ezPlugins](https://github.com/goetting/ez-plugins) contains a number of useful examples:

### /plugins/react

Useful if you wish to use ezFlux with [React](https://facebook.github.io/react/), [Inferno](https://infernojs.org/), [Preact](https://preactjs.com/) or any other react-compatible library:

### /plugins/projector

Creates a mutable projection of selected state values. It will have a one-way binding with the ezFlux state and update automatically if the state changes. This is useful for libraries that bind their behaviour directly to object mutation, such as [Vue](https://vuejs.org/).


# API Documentation

### createStore

The store save-guards the state which consists of _state-option_ and _computed-option_.  
In addition to its own API and the state keys, a store will hold all keys from the _methods-option_ and _children-option_ on the top level.

**parameters**
- `StoreOptions`
  ```TS
    type StoreOptions = {
      state?: Object,
      computed?: { [string]: { get?: Function, set?: Function } },
      methods?: { [string]: Function },
      children?: { [string]: Store },
      immutable?: boolen,
    };
  ```
**returns**
- `Store`
  ```TS
    type Store = {
      $assign: (Object, ...args: Object[]) => Store,
      $copy: () => Object,
      $keys: () => string[],
      $values: () => any[],
      $entries: () => [string, any][],
      $on: (eventName: string, eventListener: Function) => Store,
      $once: (eventName: string, eventListener: Function) => Store,
      $off: (eventName: string, eventListener: Function) => Store,
    };
  ```

### Plugins

The Plugins array is exported for direct manipulation.

```TS
type Plugin = (State, Store, Options) => void;
type Plugins = Plugin[];
```

# Contributing

Contributions of any kind are always welcome!

To run Linter, Flow, Bable and Mocha and have them watch src and test folders respectively:
```sh
$ npm start
```

To run Babel once:
```sh
$ npm run build
```
To autofix eslint issues

```sh
$ npm eslint:fix
```
