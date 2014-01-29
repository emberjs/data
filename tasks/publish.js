var path = require('path');

var S3_BUCKET_NAME       = process.env.S3_BUCKET_NAME,
    S3_ACCESS_KEY_ID     = process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY,
    TRAVIS_BRANCH        = process.env.TRAVIS_BRANCH,
    AWS, s3;

function uploadFile(data, type, destination, callback) {
  if (!AWS) {
    AWS = require('aws-sdk');
    AWS.config.update({accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY});
  }

  if (!s3)  { s3 = new AWS.S3(); }

  s3.putObject({
    Body: data,
    Bucket: S3_BUCKET_NAME,
    ContentType: type,
    Key: destination
  }, callback)
}

module.exports = function(grunt) {
  grunt.registerMultiTask('publish', 'Publish files to S3', function() {
    if (!S3_BUCKET_NAME || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      grunt.log.writeln('No AWS credentials exist.');
      return;
    }

    var done = this.async();
    var uploadPendingCount = 0;

    function finish(err, result){
      if (err) {
        grunt.log.writeln("Error: " + err + "; Result: " + result);
      }

      uploadPendingCount--;
      if (uploadPendingCount === 0) { done() }
    }

    this.files.forEach(function(f) {
      f.dest.forEach(function(dest){
        var finalDestination;
        var channel;

        if(dest.indexOf('CHANNEL') > -1) {
          if (TRAVIS_BRANCH === 'master') { channel = 'canary'; }
          if (TRAVIS_BRANCH === 'beta')   { channel = 'beta'; }
          if (TRAVIS_BRANCH === 'stable') { channel = 'release'; }

          finalDestination = dest.replace('CHANNEL', channel);
        } else {
          finalDestination = dest;
        }

        if (finalDestination) {
          uploadPendingCount++;
          grunt.log.writeln("Uploading " + f.src + " -> " + finalDestination);
          uploadFile(grunt.file.read(f.src), 'text/javascript', finalDestination, finish);
        }
      });
    });
  });
};
