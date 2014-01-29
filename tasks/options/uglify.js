var grunt = require('grunt');
module.exports = {
  options: {
    report: 'min',
    banner: grunt.file.read('generators/license.js'),
  },
  dist: {
    files: [{
     src: 'dist/ember-data.prod.js',
     dest: 'dist/ember-data.min.js',
    }]
  },
  report: {
    options:{
      report: 'gzip'
    },
    files: [{
     src: 'dist/ember-data.prod.js',
     dest: 'dist/ember-data.min.js',
    }]
  },
};
