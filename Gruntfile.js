var matchdep = require('matchdep');
module.exports = function(grunt){

  matchdep.filterDev('grunt-*').forEach(grunt.loadNpmTasks);
  grunt.loadTasks('tasks');
  var config = require('load-grunt-config')(grunt, {
    configPath: __dirname + '/tasks/options',
    init: false
  });

  config.pkg = require('./package');
  config.env = process.env;

  grunt.initConfig(config);

  grunt.registerTask('buildPackages', [
    'clean',
    'transpile:amd',
    'concat:globals',
    'browser:dist',
    'jshint'
  ]);

  grunt.registerTask('prepareTests', ['buildPackages', 'concat:tests', 'connect']);

  grunt.registerTask('test',         ['prepareTests', 'qunit:local']);
  grunt.registerTask('test:local',   'test');
  grunt.registerTask('test:release', ['prepareTests', 'qunit:release']);
  grunt.registerTask('test:beta',    ['prepareTests', 'qunit:beta']);
  grunt.registerTask('test:canary',  ['prepareTests', 'qunit:canary']);
  grunt.registerTask('test:all',     ['prepareTests', 'qunit:local', 'qunit:release', 'qunit:beta', 'qunit:canary']);

  grunt.registerTask('dev', [ 'prepareTests', 'watch' ]);
  grunt.registerTask('server', 'dev');

  grunt.registerTask('dist', ['buildPackages', 'emberDefeatureify:stripDebug', 'uglify']);
  grunt.registerTask('default', ['test']);
};
