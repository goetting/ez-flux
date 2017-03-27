const timeout = async ms => new Promise(res => setTimeout(res, ms));

export default {
  stateConfig: {
    avengers: {
      values: { hulk: 'normal', ironMan: 'normal', thor: 'normal', ready: false, someArray: [] },
      actions: {
        setAvengersReady: async () => {
          await timeout(1000);
          return { hulk: 'green', ironMan: 'suited up', thor: 'hammered', ready: true }
        },
        setHulk(data, values) {
          return { hulk: data, ready: values.ready && data.hulk === 'green' };
        },
        setData: (data, values) => data,
      },
    },
  },
};