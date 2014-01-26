module.exports = {

  packages: {
    files: [ 'packages/**/*.js', '!packages/**/test/**/*.js'],
    tasks: [ 'buildPackages', 'buildTests', 'qunit' ]
  },

  tests: {
    files: [ 'packages/**/test/**/*.js' ],
    tasks: [ 'buildTests', 'qunit' ]
  }
};
