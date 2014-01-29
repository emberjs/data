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
    'setVersionStamp',
    'clean',
    'transpile:amd',
    'concat:globals',
    'browser:dist',
    'jshint'
  ]);

  grunt.registerTask('prepareTests', ['buildPackages', 'concat:tests']);

  grunt.registerTask('test:server',  ['prepareTests', 'connect']);
  grunt.registerTask('test',         ['test:server', 'qunit:local']);
  grunt.registerTask('test:local',   'test');
  grunt.registerTask('test:release', ['test:server', 'qunit:release']);
  grunt.registerTask('test:beta',    ['test:server', 'qunit:beta']);
  grunt.registerTask('test:canary',  ['test:server', 'qunit:canary']);
  grunt.registerTask('test:all',     ['test:server', 'qunit:local', 'qunit:release', 'qunit:beta', 'qunit:canary']);

  grunt.registerTask('dev', [ 'test:server', 'watch' ]);
  grunt.registerTask('server', 'dev');

  grunt.registerTask('dist', ['buildPackages', 'emberDefeatureify:stripDebug', 'uglify:dist']);
  grunt.registerTask('default', ['test']);

  grunt.registerTask('docs', ['setVersionStamp', 'yuidoc']);
};
