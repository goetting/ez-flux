# ezFlux

ezFlux is a tiny, simple JavaScript state machine with [flux](https://www.youtube.com/watch?list=PLb0IAmt7-GS188xDYE-u1ShQmFFGbrk0v&time_continue=621&v=nYkdrAPrdcw)-like event flow.
It extends its only dependency: EventEmitter3.
Its single state can only be manipulated by actions.
If enabled, it generates a comprehensive timeline documenting all state changes.

No dispatchers, no reducers, no stores.
Only user actions, transparent events and one enumberable state.

-   [Install](#install)
-   [Usage](#usage)
-   [More EZ Libraries](#more-ez-libraries)
-   [API Documentation](#api-documentation)
    -   [EventEmitter3](#eventemitter3)
    -   [constructor](#constructor)
    -   [static deepClone](#static-deepclone)
    -   [static isPromise](#static-ispromise)
    -   [static getTriggerEventName](#static-gettriggereventname)
    -   [static getChangeEventName](#static-getchangeeventname)
    -   [history](#history)
    -   [actions](#actions)
    -   [state](#state)
    -   [getConfig](#getconfig)
    -   [setConfig](#setconfig)
-   [Contributing](#contributing)

# Install

simply install through npm.


```sh
$ npm install ez-flux --save
```

# Usage
EZFlux expects a dictionary of state-namespaces with values and actions.
The return value of actions will be Object.assigned to the values of the state-namespace.

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
// Implicit getter returns deepClone of state: { weather: { rain: false } }

ezFlux.on('change:state.weather', () => console.log(ezFlux.state.weather) );
// Full event emitter API - subscribe to changes on the 'weather' namespace of the state

ezFlux.actions.weather.setRain(true);
// Triggers our action. Our listener will now log: { rain: true };
```

ezFlux also supports asynchronous behaviour. An action may be an async function, potentially acceping a promise as a return value.

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

All actions return promises. In simple situations, this can be helpful if you wish to avoid helper values like "isLoading" on your state.

```JS
aync function renderCityWeather(city) {
  await ezFlux.actions.weather.loadData({ city });
  const { weather } = ezFlux.state;

  renderData(weather);
}
```
You may freely use this behavour to orchestrate more complex workflows.
The ezFlux will still emit the propper events for actions triggered and states changed to anyone subscribed.

# More EZ Libraries

If you wish to use ezFlux with [React](https://facebook.github.io/react/), [Inferno](https://infernojs.org/), [Preact](https://preactjs.com/) or any other react-compatible library:
- [ez-react](https://github.com/goetting/ez-react)

# API Documentation

### EventEmitter3

By extending [EventEmitter3](https://github.com/primus/eventemitter3), ezFlux contains the complete [EventEmitter API](https://nodejs.org/api/events.html).

### constructor

**parameters**
- `StateConfig` **StateConfig**
  ```TS
    type StateConfig = {
      [stateNameSpace: any]: {
        // Value members must not be functions/classes or circular.
        values: Object,
        // The return value will be applied to the stateNameSpace
        actions: {
          [actionName: any]: (userData: any, ezFlux: typeof EZFlux) => Object | Promise<Object>,
        },
      },
    }
  ```

- `Config` **Config?**
  ```TS
    type Config = {
      // Outs event data to console and saves it in history.
      // default: false
      debug?: boolean,
      // In browsers buffers, event emissions to animation frame
      // default: false
      throttleUpdates?: boolean,
     }
  ```


### _static_ deepClone

**parameters**
-   `sourceValue` **any**

Returns **any**

### _static_ isPromise

Will return true if potentialPromise.then is typeof function.

**parameters**
-   `potentialPromise` **any**

Returns **boolean**

### _static_ getTriggerEventName
**parameters**
-   `stateName` **string**
-   `actionName` **string**

Returns **string**

### _static_ getChangeEventName
**parameters**
-   `stateName` **string**

Returns **string**

### history

When config.debug is true, history will save state and event data on emission.

```TS
  type History = {
    [time: number]: {
      time: number,
      eventName: string,
      state: Object,
    },
  }
```

### actions

Will be generated based on the stateConfig given to the constructor.
Please note that an action may be called with only one arguement.

```TS
  type Actions = {
    [stateScopeName: any]: {
      [actionName: any]: (userData: any) => Promise<void>,
    },
  }
```

### state

Will be generated based on the stateConfig given to the constructor.
Implicit getter, calling EZFlux.deepClone on the internal state.

Type: Object

### getConfig

Returns **Config**

### setConfig

**Parameters**

-   `config` **Config**



# Contributing

Contributions of any kind are always welcome.  
With further simplification and performance optimization being top priority, features additions should be the absolute exception.

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

