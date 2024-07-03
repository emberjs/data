/**
 * DocumentStorage is a wrapper around the StorageManager API that provides
 * a simple interface for reading and updating documents and requests.
 */
export class DocumentStorage {
  private declare _storage: StorageManager;

  constructor() {
    this._storage = navigator.storage;
  }
}
