import DS from 'ember-data';
const { Transform } = DS;

export default class <%= classifiedModuleName %>Transform extends Transform {
  deserialize(serialized) {
    return serialized;
  }

  serialize(deserialized) {
    return deserialized;
  }
}
