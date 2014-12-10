module.exports = function(revision, tag, date){
  return {
    'ember-data.js': fileObject('ember-data.js', 'text/javascript', revision, tag, date),
    'ember-data.js.map': fileObject('ember-data.js.map', 'application/json', revision, tag, date),
    'ember-data.min.js': fileObject('ember-data.min.js', 'text/javascript', revision, tag, date),
    'ember-data.prod.js': fileObject('ember-data.prod.js', 'text/javascript', revision, tag, date)
  }
}

function fileObject(fileName, contentType, currentRevision, tag, date) {
  return {
    contentType: contentType,
    destinations: {
      canary: [
        'canary' + fileName,
        'canary/daily/' + date + fileName,
        'canary/shas/' + currentRevision + fileName
      ],
      stable: [
        'stable' + fileName,
        'stable/daily/' + date + fileName,
        'stable/shas/' + currentRevision + fileName
      ],
      beta: [
        'beta' + fileName,
        'beta/daily/' + date + fileName,
        'beta/shas/' + currentRevision + fileName
      ]
    }
  }
}
