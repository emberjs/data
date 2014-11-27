require('./runner')(
  {
    distribution: [0, 1, 5],
    name: 'create',
    suites: [
      require('./create/create-record'),
      require('./create/create-object')
    ]
  }
);
