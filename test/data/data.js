export default {
  stateConfig: {
    avengers: {
      state: { hulk: 'normal', ironMan: 'normal', thor: 'normal', ready: false },
      actions: {
        setAvengersReady(data, state) {
          setState({ hulk: 'green', ironMan: 'suited up', thor: 'hammered', ready: true });
        },
        setHulk(data, state) {
          setState({ hulk: data.hulk, ready: state.ready && data.hulk === 'green' });
        }
      }
    }
  }
}