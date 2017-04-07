# ezFlux

ezFlux is a simple JavaScript state machine with [flux](https://www.youtube.com/watch?list=PLb0IAmt7-GS188xDYE-u1ShQmFFGbrk0v&time_continue=621&v=nYkdrAPrdcw)-like event flow.  
It manages a single, forzen, enumerable state, only manipulable by actions.
Designed with http and db accesses in mind, all actions are handled asynchronously.
It can generate a comprehensive timeline, documenting all state changes.

#### Mission Statement
-   **Full transparency**: Anything accessing ezFlux is able to deduct how the state is changing and why.
-   **Performance**: With tiny file size and a high performance, this library will simply get out of your way.
-   **Simplicity**: Focused on a select few, vital features and minimal API, ezFlux reduces boiler plate _significantly_.

No dispatchers, no reducers, no stores.
Only user actions, transparent events and one enumberable state.

-   [Install](#install)
-   [Usage](#usage)
    -   [Getting Started](#getting-started)
    -   [Async Actions](#async-actions)
    -   [Middleware](#middleware)
    -   [History Recroding](#history-recroding)
-   [More EZ Libraries](#more-ez-libraries)
-   [API Documentation](#api-documentation)
    -   [constructor](#constructor)
    -   [static getEventNames](#static-geteventnames)
    -   [on](#on)
    -   [off](#off)
    -   [once](#once)
    -   [emit](#emit)
    -   [history](#history)
    -   [actions](#actions)
    -   [state](#state)
    -   [resetState](#resetstate)
    -   [resetStateScope](#resetstatescope)
-   [Contributing](#contributing)

# Install

```sh
$ npm install ez-flux --save
```

# Usage

### Getting Started

EZFlux expects a dictionary of state-namespaces with values and actions.  
The returned Object of an action will be Object.assigned to the values of the state-namespace.

```JS
import EZFlux from 'ez-flux';

const ezFlux = new EZFlux({
  weather: {
    values: {
      rain: false
    },
    actions: {
      setRain: rain => ({ rain })
    },
  },
});
```


ezFlux will assemble the state and generate action triggers for the appropriate actions.

```JS
ezFlux.state;
// Frozen Object: { weather: { rain: false } }

ezFlux.on('change:state.weather', () => console.log(ezFlux.state.weather) );
// subscribe to changes on the 'weather' namespace of the state

ezFlux.actions.weather.setRain(true);
// Triggers our action. Our listener will now log: { rain: true };
```

It's strongly discouraged to use nested objects as state values since only primitive state values will be save guarded by Object.freeze and cloning.

### Async Actions

All actions are executed asyncronously, their triggers returning promises.  
As a result an action may be an async function, accepting a promise as a return value.
An actions will always be be executed in the next tick.  


```JS
import EZFlux from 'ez-flux';

const ezFlux = new EZFlux({
  weather: {
    values: {
      rain: false,
      temperature: '0 °C',
    },
    actions: {
      setRain: rain => ({ rain }),
      loadData: async (query) => {
        const { temperature, rain } = await apiCall(query);

        return { temperature, rain };
      },
    },
  },
});
```

In simple situations, this can be helpful if you wish to avoid helper values like "isLoading" on your state.

```JS
aync function renderCityWeather(city) {
  await ezFlux.actions.weather.loadData({ city });
  const { weather } = ezFlux.state;

  renderData(weather);
}
```
You may freely use this behavour to orchestrate more complex workflows.  
The EZFlux instance will still emit the propper events for actions triggered and states changed to anyone subscribed.

### Middleware

_beforeActions_ and _afterActions_ hooks can be provided to be called on action trigger. 
Just like actions, these methods can be used asynchronously.
A returned Object or Promise<Object> will be assigned to the values of its state scope and accessable in the following hook.

```JS
import EZFlux from 'ez-flux';
import accessLayer from './access-layer';

const ezFlux = new EZFlux({
  weather: {
    values: {
      rain: true,
      temperature: 0,
      feels: 'bad'
    },
    actions: {
      setRain: rain => ({ rain }),
      loadData: async (query) => {
        const { temperature, rain } = await apiCall(query);

        return { temperature, rain };
      },
    },
    beforeAction: async function checkAccess(payload, scopeValues) => {
      const accessGranted = await accessLayer.requestUserAuthorization();

      return accessGranted ? scopeValues : false;
    },
    afterAction: function projectData(payload, scopeValues) {
      const { temperature, rain } = scopeValues;

      return { feels: (temperature < 20 || rain) ? 'bad' : 'good' };
    },
  },
});
```
### History Recroding

Passing recordHistory _true_ with options on constrcution will enable history recording.  
This allows you to exactly deduct what is manipulating your state and when.
Please note, however, that the state scopes will only be shallow cloned. Thus, nested changes will not be documented.  

```JS
import EZFlux from 'ez-flux';
import scopeConfig from './scope-config';

const options = {
  console: 'trace',
  history: {
    record: true,
    log: true,
  },
};

const ezFlux = new EZFlux(scopeConfig, options);

ezFlux.actions.weather.setRain(true);

```

Now, [ezFlux.history](#history) will be accessable und continuously populated.

```JS
ezFlux.history
```

# More EZ Libraries

If you wish to use ezFlux with [React](https://facebook.github.io/react/), [Inferno](https://infernojs.org/), [Preact](https://preactjs.com/) or any other react-compatible library:
- [ez-react](https://github.com/goetting/ez-react)

# API Documentation

### constructor

**parameters**
- `StateConfig` **StateConfig**
  ```TS
    type StateConfig = {
      [stateNameSpace: any]: {
        // Value members must not be functions/classes or circular.
        // Value members should not be Objects or Arrays.
        // Only the first dimension will be frozen and save guarded.
        values: Object,
        // Returned Object | Promsise<Object> will be applied to the stateNameSpace
        // Returned void will result in the action being aborted
        actions: {
          [actionName: any]: (
            payload: any,
            valuesClone: Object,
            ezFlux: typeof EZFlux,
            actionName: string,
          ) => void | Object | Promise<Object>,
        },
        // Will be Called before any action of this scope. 
        // Return rules are the same as for an action
        beforeActions?: (
          payload: any,
          currentValuesClone: Object,
          ezFlux: typeof EZFlux,
          actionName: string,
        ) => void | Object | Promise<Object>,
        // Will be Called after any action of this scope. 
        // Return rules are the same as for an action
        afterActions?: (
          payload: any,
          changedValuesClone: Object,
          ezFlux: typeof EZFlux,
          actionName: string,
        ) => void | Object | Promise<Object>,
      },
    };
  ```

- `Options` **Options?**
  ```TS
    type Options = {
      // Will create a history entry on every single event
      // default: false
      recordHistory?: boolean
      // initialState will overwrite values in StateConfig.
      // it must resemble the final ezFlux.state - however, any key is optional.
      // useful to pass states from other instances, e.g. in SSR or testing scenarios.
      initialState?: Object,
      // you may pass a console method (e.g. log or trace) if you wish to log events.
      // default: ''
      console?: string
    };
  ```
### _static_ getEventNames

**parameters**
-   `stateScopeName` **string**
-   `actionName` **string**

Returns **EventNames**

```TS
  type EventNames = {
    triggered: string,
    canceled: string,
    change: string,
    reset: string
  };
```



### on

Listens to an event.

**parameters**
-   `eventName` **string**
-   `eventHanlder` **Function**

### once

Listens to an event once and removes listener automatically afterwards.

**parameters**
-   `eventName` **string**
-   `eventHanlder` **Function**

### off

Removes listener.

alias: removeListener

**parameters**
-   `eventName` **string**
-   `eventHanlder` **Function**

### emit

Emits an event, calling all handlers listening to it with _payload_ .

**parameters**
-   `eventName` **string**
-   `payload` **any**

### history

If options.recordHistory was passed _true_, State and event data will be recorded on event emission.

```TS
  type HistoryEntry = {
    time: number,
    name: string,
    id: Object | number,
    state: Object,
    payload?: any
  };
  type History = { [time: number]: HistoryEntry };
```

### actions

Will be generated based on the stateConfig given to the constructor.
Please note that an action may be called with only one arguement.

```TS
  type Actions = {
    [stateScopeName: any]: {
      [actionName: any]: (payload: any) => Promise<void>,
    },
  };
```

### state

An object, forzen up to its second dimension.

Type: Object

### resetState

Will reset the state to the value it had after ezFlux was constructed initially.

### resetStateScope

**Parameters**

-   `scopeName` **string**

Will reset a specific state scope to the value it had after ezFlux was constructed initially.

# Contributing

Contributions of any kind are always welcome!

To run Linter, Flow, Bable and Jest and have them watch src and test folders respectively:
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
To generate test coverage report:

```sh
$ npm run test:coverage
```
