/* global WeakMap */
export default function deepCopy(obj) {
  return _deepCopy(obj, new WeakMap());
}

function isPrimitive(value) {
  return typeof value !== 'object' || value === null;
}

function _deepCopy(oldObject, seen) {
  if (Array.isArray(oldObject)) {
    return copyArray(oldObject, seen);
  } else if (!isPrimitive(oldObject)) {
    return copyObject(oldObject, seen);
  } else {
    return oldObject;
  }
}

function copyObject(oldObject, seen) {
  let newObject = {};

  Object.keys(oldObject).forEach(key => {
    let value = oldObject[key];
    let newValue = isPrimitive(value) ? value : seen.get(value);

    if (value && newValue === undefined) {
      newValue = newObject[key] = _deepCopy(value, seen);
      seen.set(value, newValue);
    }

    newObject[key] = newValue;
  });

  return newObject;
}

function copyArray(oldArray, seen) {
  let newArray = [];

  for (let i = 0; i < oldArray.length; i++) {
    let value = oldArray[i];
    let newValue = isPrimitive(value) ? value : seen.get(value);

    if (value && newValue === undefined) {
      newValue = newArray[i] = _deepCopy(value, seen);
      seen.set(value, newValue);
    }

    newArray[i] = newValue;
  }

  return newArray;
}
