module.exports = function(revision, tag, date){
  return {
    'ember-data.js': fileObject('ember-data.js', 'text/javascript', revision, tag, date),
    'ember-data.js.map': fileObject('ember-data.js.map', 'application/json', revision, tag, date),
    'ember-data.min.js': fileObject('ember-data.min.js', 'text/javascript', revision, tag, date),
    'ember-data.prod.js': fileObject('ember-data.prod.js', 'text/javascript', revision, tag, date)
  }
}

function fileObject(fileName, contentType, currentRevision, tag, date) {
  var filePath = '/' + fileName;
  return {
    contentType: contentType,
    destinations: {
      canary: [
        'canary' + filePath,
        'canary/daily/' + date + filePath,
        'canary/shas/' + currentRevision + filePath
      ],
      stable: [
        'stable' + filePath,
        'stable/daily/' + date + filePath,
        'stable/shas/' + currentRevision + filePath
      ],
      beta: [
        'beta' + filePath,
        'beta/daily/' + date + filePath,
        'beta/shas/' + currentRevision + filePath
      ]
    }
  }
}
