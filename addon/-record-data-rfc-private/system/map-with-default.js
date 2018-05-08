import Map from './map';

export default class MapWithDefault extends Map {
  constructor(options) {
    super();

    this.defaultValue = options.defaultValue;
  }

  get(key) {
    let hasValue = this.has(key);

    if (hasValue) {
      return super.get(key);
    } else {
      let defaultValue = this.defaultValue(key);
      this.set(key, defaultValue);
      return defaultValue;
    }
  }
}
