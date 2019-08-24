export interface Adapter {
  findRecord(store: any, type: string, id: string | number, snapshot: any): Promise<any>;
  findAll(store: any, type: string): Promise<any[]>;
  query(store: any, type: string, query: object): Promise<any>;
  queryRecord(store: any, type: string, query: object): Promise<any>;
  generateIdForRecord(store: any, type: string, inputProperties: object): string | number;
  serialize(snapshot: any, options: object): object;
  createRecord(store: any, type: string, snapshot: any): Promise<any>;
  updateRecord(store: any, type: string, snapshot: any): Promise<any>;
  deleteRecord(store: any, type: string, snapshot: any): Promise<any>;
  coalesceFindRequests: boolean;
  findMany(store: any, type: string, ids: string[] | number[], snapshots: any[]): Promise<any[]>;
  groupRecordsForFindMany(store: any, snapshots: any[]): object[][];
  shouldReloadRecord(store: any, snapshot: any): boolean;
  shouldReloadAll(store: any, snapshots: any[]): boolean;
  shouldBackgroundReloadRecord(store: any, snapshot: any): boolean;
  shouldBackgroundReloadAll(store: any, snapshots: any[]): boolean;
}
