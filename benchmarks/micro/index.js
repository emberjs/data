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
    distribution: [0, 5, 100],
    name: 'pushPayload simple-relationship',
    suites: [
      require('./push-payload-relationships/push-payload')
    ]
  }
);
