import type { ASTPath, Collection, ImportDeclaration, ImportSpecifier, JSCodeshift } from 'jscodeshift';

import { log } from '../legacy-compat-builders/log.js';
import { TransformError } from './error.js';

/**
 * Information about an import you are tracking for your codemod.
 */
export interface ImportInfo {
  importedName: string;
  sourceValue: string;
}

/**
 * Information about the imports you are tracking for your codemod.
 */
export type ImportInfos = ReadonlySet<ImportInfo>;

/**
 * Information about an existing import corresponding to an ImportInfo.
 */
export interface ExistingImport {
  localName: string; // e.g. 'computed' or 'renamedComputed'
  specifier: ImportSpecifier;
  path: ASTPath<ImportDeclaration>;
}

/**
 * Information about existing imports (if they exist) corresponding to your
 * ImportInfos.
 */
export type ExistingImports = Map<ImportInfo, ExistingImport>;

export function parseExistingImports(j: JSCodeshift, root: Collection, importInfos: ImportInfos): ExistingImports {
  log.debug('\tParsing imports');
  const existingImports: ExistingImports = new Map();

  root.find(j.ImportDeclaration).forEach((path) => {
    for (const importInfo of importInfos) {
      if (existingImports.has(importInfo)) {
        continue;
      }
      const parsed = parseImport(path, importInfo);
      if (parsed) {
        existingImports.set(importInfo, parsed);
      }
    }
  });

  return existingImports;
}

function parseImport(path: ASTPath<ImportDeclaration>, importInfo: ImportInfo): ExistingImport | null {
  const importDeclaration = path.value;
  if (!importDeclaration.specifiers || importDeclaration.source.value !== importInfo.sourceValue) {
    return null;
  }

  const match = importDeclaration.specifiers.find(
    (specifier): specifier is ImportSpecifier =>
      specifier.type === 'ImportSpecifier' && specifier.imported.name === importInfo.importedName
  );

  return match
    ? {
        localName: match.local?.name ?? match.imported.name,
        specifier: match,
        path,
      }
    : null;
}

/**
 * Add an import to the root if it doesn't already exist.
 *
 * If there are multiple existing imports from the same source, the new
 * specifier will be added to the first one with specifiers.
 */
export function addImport(j: JSCodeshift, root: Collection, { importedName, sourceValue }: ImportInfo): void {
  log.debug(`\tAdding import: ${importedName} from '${sourceValue}'`);

  // Check if the import already exists
  const existingDeclarations = root.find(j.ImportDeclaration, {
    source: {
      value: sourceValue,
    },
  });

  if (existingDeclarations.length === 0) {
    // If it doesn't exist, add the import to the end of the existing imports
    const lastImportCollection = root.find(j.ImportDeclaration).at(-1);
    if (lastImportCollection.length === 0) {
      // YOLO
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      root
        .find(j.Program)
        .get('body', 0)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .insertBefore(j.importDeclaration([j.importSpecifier(j.identifier(importedName))], j.literal(sourceValue)));
    } else {
      lastImportCollection.insertAfter(
        j.importDeclaration([j.importSpecifier(j.identifier(importedName))], j.literal(sourceValue))
      );
    }
  } else {
    // Add the specifier to the first existing import with specifiers
    const first = existingDeclarations.paths().find((path) => path.value.specifiers);
    if (!first) {
      throw new TransformError(`Somehow we found multiple import declarations for ${sourceValue} with no specifiers`);
    }
    first.value.specifiers = [...(first.value.specifiers ?? []), j.importSpecifier(j.identifier(importedName))];
  }
}

/**
 * Find and remove the given specifier, or remove the entire import declaration
 * if removing the last specifier.
 */
export function removeImport(j: JSCodeshift, { specifier: specifierToRemove, path }: ExistingImport): void {
  log.debug(`removing ${specifierToRemove.imported.name} import`);

  const importDeclaration = path.value;
  const { specifiers } = importDeclaration;

  if (!specifiers) {
    throw new TransformError('Trying to remove a specifier from an import without specifiers');
  }

  if (specifiers.length === 1) {
    // remove the entire import declaration
    j(path).remove();
  } else {
    // remove just the computed specifier
    importDeclaration.specifiers = specifiers.filter((specifier) => {
      return specifier !== specifierToRemove;
    });
  }
}
