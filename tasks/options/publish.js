var date =  new Date().toISOString().replace(/-/g, '').replace(/T.+/, '')
var sha     = process.env.TRAVIS_COMMIT;

function destinationsForType(extension){
  var filename = 'ember-data' + extension;

  return ['CHANNEL/' + filename,
          'CHANNEL/daily/' + date + '/' + filename,
          'CHANNEL/shas/' + sha + '/' + filename]
}

module.exports = {
  debug: {
    files: [{
     src: 'dist/ember-data.js',
     dest: destinationsForType('.js')
    }]
  },
  prod: {
    files: [{
     src: 'dist/ember-data.prod.js',
     dest: destinationsForType('.prod.js')
    }]
  },
  min: {
    files: [{
     src: 'dist/ember-data.min.js',
     dest: destinationsForType('.min.js')
    }]
  }
};

