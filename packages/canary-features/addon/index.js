import { assign } from '@ember/polyfills';
import global from '@ember-data/canary-features/environment';
// import { ENV } from '@ember-data/canary-features/
export const ENV = {
  FEATURES: {},
};
console.log(global.EMBER_ENV, global.ENV, global.FEATURES);
(EmberENV => {
  if (typeof EmberENV !== 'object' || EmberENV === null) return;

  for (let flag in EmberENV) {
    if (
      !EmberENV.hasOwnProperty(flag) ||
      flag === 'EXTEND_PROTOTYPES' ||
      flag === 'EMBER_LOAD_HOOKS'
    )
      continue;
    let defaultValue = ENV[flag];
    if (defaultValue === true) {
      ENV[flag] = EmberENV[flag] !== false;
    } else if (defaultValue === false) {
      ENV[flag] = EmberENV[flag] === true;
    }
  }
})(global.EmberENV || global.ENV);

export const DEFAULT_FEATURES = {
  sample_feature_flag: null,
};

export const FEATURES = assign(DEFAULT_FEATURES, ENV.FEATURES);
export const sample_feature_flag = DEFAULT_FEATURES.sample_feature_flag;
