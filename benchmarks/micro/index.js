
require('./runner')(
  {
    distribution: [0],
    name: 'buildRecord',
    suites: [
      require('./build/build-record')
    ]
  }
);
