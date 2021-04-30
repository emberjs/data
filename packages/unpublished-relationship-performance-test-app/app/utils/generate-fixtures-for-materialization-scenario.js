const COLORS = ['red', 'white', 'black', 'pink', 'green', 'blue', 'yellow', 'orange', 'green', 'teal'];
const SIZES = ['square', 'rectangle', 'circle', 'oval', 'cube', 'small', 'medium', 'large', 'extra large'];
const TYPES = ['suv', 'sedan', 'minivan', 'electric', 'hybrid', 'truck', 'sport'];

let FIXTURE_ID = 0;

function getIndex(index, fixtures) {
  const count = fixtures.length;
  return index % count;
}

function assignToMany(resource, id) {
  resource.relationships = resource.relationships || {};
  const cars = (resource.relationships.cars = resource.relationships.cars || { data: [] });
  cars.data.push({
    type: 'car',
    id,
  });
}

function getRelatedResource(fixtures, index, id) {
  const resource = fixtures[getIndex(index, fixtures)];
  assignToMany(resource, id);
  return { id: resource.id, type: resource.type };
}

function createCarsPayload(n) {
  performance.mark('start-fixture-generation');
  const colors = getColorResources();
  const types = getTypeResources();
  const sizes = getSizeResources();
  const data = new Array(n);
  for (let i = 0; i < n; i++) {
    const id = `urn:car:${FIXTURE_ID++}`;
    data[i] = {
      id,
      type: 'car',
      attributes: {},
      relationships: {
        type: {
          data: getRelatedResource(types, i, id),
        },
        size: {
          data: getRelatedResource(sizes, i, id),
        },
        colors: {
          data: [
            getRelatedResource(colors, i, id),
            getRelatedResource(colors, i + 1, id),
            getRelatedResource(colors, i + 2, id),
          ],
        },
      },
    };
  }

  const fixture = {
    data,
    included: [].concat(colors, types, sizes),
  };
  performance.mark('end-fixture-generation');

  return fixture;
}

function getColorResources() {
  return COLORS.map((name) => createJsonApiResource(`urn:color:${FIXTURE_ID++}`, 'color', { name }));
}

function getSizeResources() {
  return SIZES.map((name) => createJsonApiResource(`urn:size:${FIXTURE_ID++}`, 'size', { name }));
}

function getTypeResources() {
  return TYPES.map((name) => createJsonApiResource(`urn:type:${FIXTURE_ID++}`, 'type', { name }));
}

function createJsonApiResource(id, type, attributes) {
  return {
    id,
    type,
    attributes,
  };
}

const CARS_PAYLOAD = createCarsPayload(10000);

export default CARS_PAYLOAD;
