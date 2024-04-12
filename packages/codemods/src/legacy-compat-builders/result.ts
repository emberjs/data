import type { ImportInfo } from '../utils/imports.js';

export class TransformResult {
  importsToAdd = new Set<ImportInfo>();

  merge(other: TransformResult): void {
    other.importsToAdd.forEach((importToAdd) => this.importsToAdd.add(importToAdd));
  }
}
