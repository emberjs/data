import Transform from '@ember-data/serializer/transform';

export default class <%= classifiedModuleName %>Transform extends Transform {
  deserialize(serialized) {
    return serialized;
  }

  serialize(deserialized) {
    return deserialized;
  }
}
