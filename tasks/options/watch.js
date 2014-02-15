module.exports = {

  packages: {
    files: [ 'packages/**/*.js', '!packages/**/test/**/*.js'],
    tasks: [ 'lock', 'buildPackages', 'prepareTests', 'unlock', 'qunit:local' ]
  },

  tests: {
    files: [ 'packages/**/test/**/*.js' ],
    tasks: [ 'lock', 'prepareTests', 'unlock', 'qunit:local' ]
  }
};
