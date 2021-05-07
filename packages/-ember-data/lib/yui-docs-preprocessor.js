/* eslint-disable no-console */
function hasProp(obj, prop) {
  return Object.hasOwnProperty.call(obj, prop);
}
function shouldKeepItem(item, excludedTags) {
  for (let i = 0; i < excludedTags.length; i++) {
    if (hasProp(item, excludedTags[i])) return false;
  }

  return true;
}

module.exports = function (data, options) {
  console.log('Running ember-data preprocessor...');

  if (!options.excludeTags) {
    console.log('no tags to exclude, exiting');
    return;
  }
  const excludedTags = [...options.excludeTags];
  console.log('Skipping items with the tags: ' + excludedTags);

  let acceptedWarnings = [];

  for (let t in excludedTags) {
    acceptedWarnings.push('unknown tag: ' + excludedTags[t]);
  }

  let keepWarnings = [];

  for (let w in data.warnings) {
    if (acceptedWarnings.indexOf(data.warnings[w].message) < 0) {
      keepWarnings.push(data.warnings[w]);
    }
  }

  data.warnings = keepWarnings;

  // filter classes on modules
  for (let m in data.modules) {
    let moduleData = data.modules[m];
    let keepClasses = {};
    for (let c in moduleData.classes) {
      if (shouldKeepItem(data.classes[c], excludedTags)) {
        keepClasses[c] = moduleData.classes[c];
      }
    }
    moduleData.classes = keepClasses;
  }

  // filter classes
  let keepClasses = {};
  for (let c in data.classes) {
    if (shouldKeepItem(data.classes[c], excludedTags)) {
      keepClasses[c] = data.classes[c];
    }
  }
  data.classes = keepClasses;

  // filter classitems
  let keepItems = [];
  for (let i in data.classitems) {
    if (shouldKeepItem(data.classitems[i], excludedTags)) {
      keepItems.push(data.classitems[i]);
    }
  }
  data.classitems = keepItems;
};
