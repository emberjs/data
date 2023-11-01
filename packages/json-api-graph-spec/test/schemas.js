const Company = new Map([
  ['name', { type: 'string', name: 'name', options: null, kind: 'attribute' }],
  ['employees', { type: 'employee', name: 'employees', options: null, kind: 'collection' }],
  ['ceo', { type: 'employee', name: 'ceo', options: null, kind: 'resource' }],
]);
const Employee = new Map([
  ['name', { type: 'string', name: 'name', options: null, kind: 'attribute' }],
  ['company', { type: 'company', name: 'company', options: null, kind: 'resource' }],
  ['profileImage', { type: 'string', name: 'profileImage', options: null, kind: 'attribute' }],
  ['reportsTo', { type: 'employee', name: 'reportsTo', options: null, kind: 'resource' }],
  ['reports', { type: 'employee', name: 'reports', options: null, kind: 'collection' }],
]);

export default new Map([
  ['company', Company],
  ['employee', Employee],
]);
