import { assign } from '@ember/polyfills';

// publicProps(['prop1', 'prop2'], { prop1: val, prop2: val2, privatePro: val3 }) -> { prop1: val, prop2: val2 }
export default function publicProps(publicArgs, obj) {
  return assign.apply(
    this,
    [{}].concat(
      Object.keys(obj).map(key => ({
        [key]: assign.apply(this, [{}].concat(publicArgs.map(prop => ({ [prop]: obj[key][prop] })))),
      }))
    )
  );
}
