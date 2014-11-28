require('./runner')(
  {
    distribution: [0, 1, 5],
    name: 'create',
    suites: [
      require('./create/create-object'),
      require('./create/create-record')
    ]
  }
);

require('./runner')(
  {
    distribution: [0, 1, 5, 100, 1000, 10000],
    name: 'pushPayload',
    suites: [
      require('./push-payload/push-payload')
    ]
  }
);
