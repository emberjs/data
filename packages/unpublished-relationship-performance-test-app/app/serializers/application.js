export default class Serializer {
  static create() {
    return new this();
  }

  normalizeResponse(_, __, payload) {
    return payload;
  }
}
