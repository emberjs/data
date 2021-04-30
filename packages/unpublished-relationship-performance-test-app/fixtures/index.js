const fs = require('fs');

const createParentPayload = require('./create-parent-payload');
const createCarsPayload = require('./create-cars-payload');

fs.writeFileSync('./public/fixtures/add-children-initial.json', JSON.stringify(createParentPayload(19600)), 'utf-8');
fs.writeFileSync('./public/fixtures/add-children-final.json', JSON.stringify(createParentPayload(20000)), 'utf-8');
fs.writeFileSync('./public/fixtures/destroy.json', JSON.stringify(createParentPayload(2000, 500)), 'utf-8');
fs.writeFileSync('./public/fixtures/materialization.json', JSON.stringify(createCarsPayload(10000)), 'utf-8');
fs.writeFileSync('./public/fixtures/unload.json', JSON.stringify(createParentPayload(2000, 500)), 'utf-8');
fs.writeFileSync(
  './public/fixtures/unused-relationships.json',
  JSON.stringify(createParentPayload(2000, 500)),
  'utf-8'
);
