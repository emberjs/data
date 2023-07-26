function isResource(resource: unknown): resource is Record<string, unknown> {
  return Boolean(resource && typeof resource === 'object');
}

function hasProp<T extends string, K extends { [J in T]: string }>(resource: unknown, prop: T): resource is K {
  return Boolean(
    isResource(resource) && prop in resource && typeof resource[prop] === 'string' && (resource[prop] as string).length
  );
}

export function hasLid(resource: unknown): resource is { lid: string } {
  return hasProp(resource, 'lid');
}

export function hasId(resource: unknown): resource is { id: string } {
  return (
    hasProp(resource, 'id') || Boolean(isResource(resource) && 'id' in resource && typeof resource.id === 'number')
  );
}

export function hasType(resource: unknown): resource is { type: string } {
  return hasProp(resource, 'type');
}
