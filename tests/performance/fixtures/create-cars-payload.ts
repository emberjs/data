const COLORS = ['red', 'white', 'black', 'pink', 'green', 'blue', 'yellow', 'orange', 'green', 'teal'];
const SIZES = ['square', 'rectangle', 'circle', 'oval', 'cube', 'small', 'medium', 'large', 'extra large'];
const MAKES = ['suv', 'sedan', 'minivan', 'electric', 'hybrid', 'truck', 'sport'];

let FIXTURE_ID = 0;

type JSONIdentifier = { id: string; type: string };

type JSONAPIResource = {
  id: string;
  type: string;
  attributes: Record<string, string>;
  relationships?: Record<string, { data: JSONIdentifier | JSONIdentifier[] }>;
};

type JSONAPIPayload = {
  data: JSONAPIResource[];
  included: JSONAPIResource[];
};

function getIndex(index: number, fixtures: unknown[]) {
  const count = fixtures.length;
  return index % count;
}

function assignToMany(resource: JSONAPIResource, id: string) {
  resource.relationships = resource.relationships || {};
  const cars = (resource.relationships.cars = resource.relationships.cars || { data: [] });
  assert('Expected cars.data to be an array', Array.isArray(cars.data));
  cars.data.push({
    type: 'car',
    id,
  });
}

function getRelatedResource(fixtures: JSONAPIResource[], index: number, id: string) {
  const resource = fixtures[getIndex(index, fixtures)];
  assignToMany(resource, id);
  return { id: resource.id, type: resource.type };
}

function createCarsPayload(n: number, c = 1): JSONAPIPayload {
  const colors = getColorResources(c);
  const makes = getMakeResources();
  const sizes = getSizeResources();
  const data = new Array<JSONAPIResource>(n);
  for (let i = 0; i < n; i++) {
    const id = `urn:car:${FIXTURE_ID++}`;
    data[i] = {
      id,
      type: 'car',
      attributes: {},
      relationships: {
        make: {
          data: getRelatedResource(makes, i, id),
        },
        size: {
          data: getRelatedResource(sizes, i, id),
        },
        colors: {
          data:
            c === 1
              ? [
                  getRelatedResource(colors, i, id),
                  getRelatedResource(colors, i + 1, id),
                  getRelatedResource(colors, i + 2, id),
                ]
              : new Array(colors.length).fill(null).map((_v, ii) => getRelatedResource(colors, i + ii, id)),
        },
      },
    };
  }

  const fixture = {
    data,
    included: ([] as JSONAPIResource[]).concat(colors, makes, sizes),
  };

  return fixture;
}

function getColorResources(c: number) {
  return COLORS.flatMap((name) => {
    if (c > 1) {
      return new Array(c)
        .fill(null)
        .map((_v, i) => createJsonApiResource(`urn:color:${FIXTURE_ID++}`, 'color', { name: `${name}-${i}` }));
    } else {
      return [createJsonApiResource(`urn:color:${FIXTURE_ID++}`, 'color', { name })];
    }
  });
}

function getSizeResources() {
  return SIZES.map((name) => createJsonApiResource(`urn:size:${FIXTURE_ID++}`, 'size', { name }));
}

function getMakeResources() {
  return MAKES.map((name) => createJsonApiResource(`urn:make:${FIXTURE_ID++}`, 'make', { name }));
}

function createJsonApiResource(id: string, type: string, attributes: Record<string, string>): JSONAPIResource {
  return {
    id,
    type,
    attributes,
  };
}

function deleteHalfTheColors(payload: JSONAPIPayload) {
  const payloadWithRemoval = structuredClone(payload);

  for (const carDatum of payloadWithRemoval.data) {
    assert('Expected carDatum to have relationships', carDatum.relationships);
    assert('Expected carDatum to have colors array', Array.isArray(carDatum.relationships.colors.data));
    const colorsLength = carDatum.relationships.colors.data.length;
    const removedColors = carDatum.relationships.colors.data.splice(0, colorsLength / 2);
    for (const removed of removedColors) {
      const included = payloadWithRemoval.included.find((r) => r.type === 'color' && r.id === removed.id);
      assert('Expected to find color in included', included);
      assert('Expected color to have relationships', included.relationships);
      assert('Expected color to have cars', Array.isArray(included.relationships.cars.data));
      included.relationships.cars.data = included.relationships.cars.data.filter((car) => car.id !== carDatum.id);
    }
  }

  return payloadWithRemoval;
}

function assert(message: string, condition: unknown): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

module.exports = { createCarsPayload, deleteHalfTheColors };
