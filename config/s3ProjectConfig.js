function fileMap(revision,tag,date) {
  return {
    'docs/data.json':             fileObject('ember-data-docs', '.json', 'application/json', revision, tag, date)
  };
}

function fileObject(baseName, extension, contentType, currentRevision, tag, date){
  var fullName = '/' + baseName + extension;
  var obj =  {
    contentType: contentType,
      destinations: {
        canary: [
          'latest' + fullName,
          'canary' + fullName,
          'canary/daily/' + date + fullName,
          'canary/shas/' + currentRevision + fullName
        ],
        release: [
          'stable' + fullName,
          'release' + fullName,
          'release/daily/' + date + fullName,
          'release/shas/' + currentRevision + fullName
        ],
        beta: [
          'beta' + fullName,
          'beta/daily/' + date + fullName,
          'beta/shas/' + currentRevision + fullName
        ],
        wildcard: []
      }
   };

   if (tag) {
     for (var key in obj.destinations) {
       obj.destinations[key].push('tags/' + tag + fullName);
     }
   }

   return obj;
}

module.exports = fileMap;
