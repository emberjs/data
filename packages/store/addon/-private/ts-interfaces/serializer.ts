import {
  JsonApiResource
} from './record-data-json-api';
export default interface Serializer {
  store: any;
  normalizeResponse(store: any, primaryModelClass: any, payload: JsonApiResource, id: string | number, requestType: string): any;
  serialize(typeClass: any, hash: object): object;
}
