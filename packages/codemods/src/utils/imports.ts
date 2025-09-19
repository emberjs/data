import type { ASTPath, Collection, FileInfo, ImportDeclaration, ImportSpecifier, JSCodeshift } from 'jscodeshift';

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
 * Information about an import you are tracking for your codemod, including
 * information about the import added while parsing imports.
 */
export interface ParsedImportInfo {
  importedName: string;
  localName: string;
  sourceValue: string;
  existingImport: ExistingImport | undefined;
}

/**
 * Information about an existing import corresponding to an ImportInfo's imported name.
 */
export interface ExistingImport {
  localName: string; // e.g. 'computed' or 'renamedComputed'
  specifier: ImportSpecifier;
  path: ASTPath<ImportDeclaration>;
}

export function parseExistingImports(
  fileInfo: FileInfo,
  j: JSCodeshift,
  root: Collection,
  importInfos: ImportInfo[]
): ParsedImportInfo[] {
  log.debug({ filepath: fileInfo.path, message: '\tParsing imports' });

  const existingImports = new Map<string, ExistingImport>();
  const knownSpecifierNames = new Set<string>();

  root.find(j.ImportDeclaration).forEach((path) => {
    path.value.specifiers?.forEach((specifier) => {
      switch (specifier.type) {
        case 'ImportSpecifier': {
          const localName = typeof specifier.local?.name === 'string' ? specifier.local.name : String(specifier.local?.name?.name || '');
          const importedName = typeof specifier.imported.name === 'string' ? specifier.imported.name : String(specifier.imported.name?.name || specifier.imported.name);
          knownSpecifierNames.add(localName || importedName);
          break;
        }
        case 'ImportDefaultSpecifier':
        case 'ImportNamespaceSpecifier': {
          if (specifier.local) {
            const localName = typeof specifier.local?.name === 'string' ? specifier.local.name : String(specifier.local?.name?.name || specifier.local?.name || '');
            if (localName) knownSpecifierNames.add(localName);
          }
          break;
        }
      }
    });

    for (const importInfo of importInfos) {
      if (existingImports.has(importInfo.importedName)) {
        continue;
      }
      const parsed = parseImport(path, importInfo);
      if (parsed) {
        existingImports.set(importInfo.importedName, parsed);
      }
    }
  });

  const parsedImportInfos: ParsedImportInfo[] = [];
  for (const importInfo of importInfos) {
    const existingImport = existingImports.get(importInfo.importedName);
    const localName = existingImport
      ? existingImport.localName
      : safeLocalName(importInfo.importedName, knownSpecifierNames, 'legacy');

    parsedImportInfos.push({ ...importInfo, localName, existingImport });
  }

  return parsedImportInfos;
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
        localName: String((typeof match.local?.name === 'string' ? match.local.name : match.local?.name?.name || match.local?.name) ??
                  (typeof match.imported.name === 'string' ? match.imported.name : match.imported.name?.name || match.imported.name)),
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
export function addImport(
  fileInfo: FileInfo,
  j: JSCodeshift,
  root: Collection,
  { importedName, localName, sourceValue }: ParsedImportInfo
): void {
  let specifier: ImportSpecifier;
  if (!localName || localName === importedName) {
    log.debug({ filepath: fileInfo.path, message: `\tAdding import: ${importedName} from '${sourceValue}'` });
    specifier = j.importSpecifier.from({
      imported: j.identifier(importedName),
    });
  } else {
    specifier = j.importSpecifier.from({
      imported: j.identifier(importedName),
      local: j.identifier(localName),
    });
  }

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
        .insertBefore(j.importDeclaration([specifier], j.literal(sourceValue)));
    } else {
      lastImportCollection.insertAfter(j.importDeclaration([specifier], j.literal(sourceValue)));
    }
  } else {
    // Add the specifier to the first existing import with specifiers
    const first = existingDeclarations.paths().find((path) => path.value.specifiers);
    if (!first) {
      throw new TransformError(`Somehow we found multiple import declarations for ${sourceValue} with no specifiers`);
    }
    first.value.specifiers = [...(first.value.specifiers ?? []), specifier];
  }
}

/**
 * Find and remove the given specifier, or remove the entire import declaration
 * if removing the last specifier.
 */
export function removeImport(j: JSCodeshift, { specifier: specifierToRemove, path }: ExistingImport): void {
  log.debug(`removing ${String(specifierToRemove.imported.name)} import`);

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

function safeLocalName(desiredName: string, knownSpecifierNames: Set<string>, namespace: string): string {
  let result = desiredName;
  let i = 0;
  while (knownSpecifierNames.has(result)) {
    if (i === 0 && namespace.length) {
      result = `${namespace}${result.charAt(0).toUpperCase() + result.slice(1)}`;
    } else if (namespace.length) {
      result = `${result}${i}`;
    } else {
      result = `${result}${i + 1}`;
    }
    i++;
  }
  return result;
}
