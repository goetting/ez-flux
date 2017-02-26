# ezFlux (WIP)

ezFlux is a tiny, simple and easy to use state machine with flux-like event flow.
A single, enumberable appState serves as its one source of truth.
It uses a single event emitter instance and, if enabled, generates a comprehensive timeline documenting all appState changes.
Its only dependency is EventEmitter3.

Small, transparent and easy to reason with. Great Library. Just great. It's fantastic.

### Wording:

- appState - Single Object, saveguarded and gouverend by all stores.
- stores - Each controls one element key on the AppState, called the storeState. Holds reactions.
- reactions - Their return value manipulates the state of their respective store and thus the appState. Triggered by actions.
- actions - Trigger reactions. Return clones of manipulated storeState.
- bus - EventEmitter3 instance. Used to ensure communication between actions, reactions and to emit appState changes.

### Usage
In Order to get started, the user will only have to pass store configurations with a simple state type definition and reactions.
AppState, Actions and EventHandling like so:

```JS
import EZFlux from 'ez-flux';

const ezFlux = new EZFlux({
  weather: {
    stateTypes: { temperature: 'number', rain: 'boolean' },
    reactions: {
      setData(data, storeStateClone) {
        return Object.assign(storeStateClone, data);
      },
    },
  },
});
```

the following keys and methods will then become accessable:

```JS
ezFlux.appState;
// { weather: { temperature: 0, rain: false } }
ezFlux.stores.weather;
// working store instance
ezFlux.on('change.weather', (storeState) => console.log(storeState));
// will out { temperature: 20, rain: true } after the next line
ezFlux.actions.weather.setData({ temperature: 20, rain: true });
// manipulates all the state!
```

### Development

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

