require('./runner')(
  {
    distribution: [0, 5, 20],
    name: 'pushPayload',
    suites: [
      require('./push-payload/push-payload')
    ]
  }
);

require('./runner')(
  {
    distribution: [0, 5, 20],
    name: 'pushPayload simple-relationship',
    suites: [
      require('./push-payload-relationships/push-payload')
    ]
  }
);

require('./runner')(
  {
    distribution: [0, 5, 20],
    name: 'pushPayload self-relationship',
    suites: [
      require('./push-payload-relationships-self/push-payload')
    ]
  }
);
