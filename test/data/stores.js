export default {
  avengers: {
    stateTypes: {
      hulk: 'string',
      ironMan: 'string',
      thor: 'string',
      ready: 'boolean',
    },
    state: {
      hulk: 'normal',
      ironMan: 'normal',
      thor: 'normal',
      ready: false,
    },
    reactions: {
      setAvengersReady(data, state) {
        return {
          hulk: 'green',
          ironMan: 'suited up',
          thor: 'hammered',
          ready: true,
        };
      },
      setHulk(data, state) {
        return { hulk: data.hulk, ready: state.ready && data.hulk === 'green' };
      }
    }
  }
}