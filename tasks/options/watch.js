module.exports = {

  packages: {
    files: [ 'packages/**/*.js', '!packages/**/test/**/*.js'],
    tasks: [ 'buildPackages', 'prepareTests', 'qunit:local' ]
  },

  tests: {
    files: [ 'packages/**/test/**/*.js' ],
    tasks: [ 'prepareTests', 'qunit:local' ]
  }
};
