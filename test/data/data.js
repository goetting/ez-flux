export default {
  stateConfig: {
    avengers: {
      state: { hulk: 'normal', ironMan: 'normal', thor: 'normal', ready: false },
      actions: {
        setAvengersReady(data, state, setState) {
          setState({ hulk: 'green', ironMan: 'suited up', thor: 'hammered', ready: true });
        },
        setHulk(data, state, setState) {
          setState({ hulk: data, ready: state.ready && data.hulk === 'green' });
        },
        setData(data, state, setState) {
          setState(data);
        },
      },
    },
  },
}