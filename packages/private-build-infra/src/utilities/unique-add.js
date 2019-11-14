module.exports = function uniqueAdd(obj, key, values) {
  const a = (obj[key] = obj[key] || []);

  for (let i = 0; i < values.length; i++) {
    if (a.indexOf(values[i]) === -1) {
      a.push(values[i]);
    }
  }
};
