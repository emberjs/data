export default class Serializer {
  normalizeResponse(_, __, payload) {
    return payload;
  }
  static create() {
    return new this();
  }
}
