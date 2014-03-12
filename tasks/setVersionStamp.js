module.exports = function(grunt) {
  grunt.registerTask('setVersionStamp', 'Add the currentRevision and versionStamp values to the global grunt config', function() {
    var done = this.async();

    grunt.util.spawn({cmd: 'git', args: ['rev-list', 'HEAD', '-n', '1']}, function(error, result, code){
      grunt.config('currentRevision', result.toString());
      grunt.config('versionStamp', grunt.config('pkg.version') + '.' + grunt.config('currentRevision').substr(0,8));
      done();
    })
  });
};
