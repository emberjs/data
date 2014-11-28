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
    distribution: [0],
    name: 'buildRecord',
    suites: [
      require('./build/build-record')
    ]
  }
);
