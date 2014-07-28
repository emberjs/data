module.exports = function(revision, tag, date){
  return {
    'ember-data.js': fileObject('ember-data', '.js', 'text/javascript', revision, tag, date),
    'ember-data.min.js': fileObject('ember-data.min', '.js', 'text/javascript', revision, tag, date),
    'ember-data.prod.js': fileObject('ember-data.prod', '.js', 'text/javascript', revision, tag, date)
  }
}

function fileObject(baseName, extension, contentType, currentRevision, tag, date) {
  var fullName = "/" + baseName + extension;
  return {
    contentType: contentType,
    destinations: {
      canary: [
        'canary' + fullName,
        'canary/daily/' + date + fullName,
        'canary/shas/' + currentRevision + fullName
      ],
      stable: [
        'stable' + fullName,
        'stable/daily/' + date + fullName,
        'stable/shas/' + currentRevision + fullName
      ],
      beta: [
        'beta' + fullName,
        'beta/daily/' + date + fullName,
        'beta/shas/' + currentRevision + fullName
      ]
    }
  }
}
