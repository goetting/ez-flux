# ezFlux (WIP)

ezFlux is a tiny, simple and easy to use state machine with flux-like event flow.
A single, enumberable state serves as data core.
It uses one, exposed event emitter instance and, if enabled, generates a comprehensive timeline documenting all state changes.
Its only dependency is EventEmitter3.

Small, transparent and easy to reason with. Great Library. Just great. It's fantastic.

### Glossary

- state - Single, enumerable object, may only be manipulated by reactions.
- reactions - Manipulate their parent namespace on the state.
- actions - Trigger reactions.
- bus - EventEmitter3 instance. Hooks up actions, reactions and exposes state changes.

### Usage
In Order to get started, the user will only have to pass namespace configurations with a simple state type definition and reactions:

```JS
import EZFlux from 'ez-flux';

const ezFlux = new EZFlux({
  weather: {
    stateTypes: { temperature: 'number', rain: 'boolean' },
    reactions: {
      setData: ({ temperature, rain }) => ({ temperature, rain }),
      setRain: rain => ({ rain }),
    },
  },
});
```

ezFlux will use the event system to hook actions up with the state and make the following keys and methods will available to the user:

```JS
ezFlux.state.get();
// { weather: { temperature: 0, rain: false } }
ezFlux.state.weather.get();
// { temperature: 0, rain: false }
ezFlux.state.weather.getTypes();
// { temperature: 'number', rain: 'boolean' }
ezFlux.on('change.weather', storeState => console.log(storeState));
// will out { temperature: 0, rain: true } after:
ezFlux.actions.weather.setRain(true);
// triggers trigger-event, state manipulation by reactions and change-event.
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

