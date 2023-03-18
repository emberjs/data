export default class <%= classifiedModuleName %>Transform {
  deserialize(serialized) {
    return serialized;
  }

  serialize(deserialized) {
    return deserialized;
  }

  static create() {
    return new this();
  }
}
