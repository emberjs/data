var lockFile = require('lockfile');
var grunt    = require('grunt');
var LOCKFILE = __dirname + "/../tmp/connect.lock";

grunt.registerTask('lock', function(){
  lockFile.lockSync(LOCKFILE);
});

grunt.registerTask('unlock', function(){
  lockFile.unlockSync(LOCKFILE);
});
