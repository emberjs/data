/* eslint-env node */
module.exports = {
  scenarios: [
    {
      name: 'default',
      bower: {
        dependencies: { }
      }
    },
    {
      name: 'ember-1-13',
      bower: {
        dependencies: {
          'ember': '1.13.13'
        },
        resolutions: {
          'ember': '1.13.13'
        }
      },
      npm: {
        'ember-source': null
      }
    },
    {
      name: 'ember-2-4',
      bower: {
        dependencies: {
          'ember': '~2.4.0'
        },
        resolutions: {
          'ember': '~2.4.0'
        }
      },
      npm: {
        'ember-source': null
      }
    },
    {
      name: 'ember-2-8',
      bower: {
        dependencies: {
          'ember': '~2.8.0'
        },
        resolutions: {
          'ember': '~2.8.0'
        }
      },
      npm: {
        'ember-source': null
      }
    },
    {
      name: 'ember-release',
      bower: {
        dependencies: {
          'ember': 'components/ember#release'
        },
        resolutions: {
          'ember': 'release'
        }
      },
      npm: {
        'ember-source': null
      }
    },
    {
      name: 'ember-beta',
      bower: {
        dependencies: {
          'ember': 'components/ember#beta'
        },
        resolutions: {
          'ember': 'beta'
        }
      },
      npm: {
        'ember-source': null
      }
    },
    {
      name: 'ember-canary',
      bower: {
        dependencies: {
          'ember': 'components/ember#canary'
        },
        resolutions: {
          'ember': 'canary'
        }
      },
      npm: {
        'ember-source': null
      }
    },
    {
      name: 'ember-alpha',
      bower: {
        dependencies: {
          'ember': 'alpha'
        },
        resolutions: {
          'ember': 'alpha'
        }
      },
      npm: {
        'ember-source': null
      }
    }
  ]
};
