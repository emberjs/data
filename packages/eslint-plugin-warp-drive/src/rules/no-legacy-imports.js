'use strict';

const path = require('path');

const RULE_ID = 'warp-drive.no-legacy-imports';

// TODO: determine where this thing should live long-term
function buildMapping() {
  // Attempt to load the enriched mapping JSON from the repo root.
  // In this monorepo, this file lives at: <repoRoot>/public-exports-mapping-5.5.enriched.json
  const candidates = [
    // from this file at packages/eslint-plugin-warp-drive/src/rules/, walk up to repo root
    path.join(__dirname, './public-exports-mapping-5.5.enriched.json'),
    // from package root (if tests change CWD)
    path.join(process.cwd(), 'public-exports-mapping-5.5.enriched.json'),
  ];

  let mappingArray = null;
  for (const candidate of candidates) {
    try {
      mappingArray = require(candidate);
      break;
    } catch (_e) {
      // continue
    }
  }

  /**
   * Map key: `${module}::${exportName}` where exportName can be 'default'.
   * Map value: replacement module string
   */
  const lookup = new Map();

  if (Array.isArray(mappingArray)) {
    for (const entry of mappingArray) {
      // Only consider non-type exports and entries that have a clear replacement.module
      if (!entry || entry.typeOnly) continue;
      const srcMod = entry.module;
      const exp = entry.export;
      const repl = entry.replacement && entry.replacement.module;
      if (!srcMod || !exp || !repl) continue;
      lookup.set(`${srcMod}::${exp}`, repl);
    }
  }

  return lookup;
}

const MAPPING = buildMapping();

/** @param {import('eslint').Rule.RuleContext} context */
function createHelpers(context) {
  const sourceCode = context.sourceCode || context.getSourceCode();

  function getQuoteChar(node) {
    const raw = sourceCode.getText(node.source);
    return raw.startsWith('"') ? '"' : "'";
  }

  function getImportExportNameFromImportSpecifier(spec) {
    // default import
    if (spec.type === 'ImportDefaultSpecifier') return 'default';
    if (spec.type === 'ImportSpecifier') return spec.imported && spec.imported.name;
    // namespace import – not supported in v1
    return null;
  }

  function groupImportSpecifiersByTarget(moduleName, specifiers) {
    /** @type {Record<string, import('estree').ImportSpecifier[] | any[]>} */
    const groups = Object.create(null);
    for (const spec of specifiers) {
      const expName = getImportExportNameFromImportSpecifier(spec);
      if (!expName) {
        // namespace or unknown – keep under original module
        groups[moduleName] ||= [];
        groups[moduleName].push(spec);
        continue;
      }
      const key = `${moduleName}::${expName}`;
      const target = MAPPING.get(key);
      const targetModule = target || moduleName; // unknowns remain under original module
      groups[targetModule] ||= [];
      groups[targetModule].push(spec);
    }
    return groups;
  }

  function hasAnyMappedTarget(groups, originalModule) {
    return Object.keys(groups).some((mod) => mod !== originalModule);
  }

  function buildImportTextForGroup(groupModule, specs, quote) {
    const defaultSpecs = specs.filter((s) => s.type === 'ImportDefaultSpecifier');
    const namedSpecs = specs.filter((s) => s.type === 'ImportSpecifier');

    const parts = ['import '];
    if (defaultSpecs.length) {
      // There can only be one default spec per declaration originally, but after grouping we still guard
      parts.push(defaultSpecs.map((s) => sourceCode.getText(s)).join(', '));
    }
    if (namedSpecs.length) {
      if (defaultSpecs.length) parts.push(', ');
      const body = namedSpecs.map((s) => sourceCode.getText(s)).join(', ');
      parts.push('{ ', body, ' }');
    }
    if (!defaultSpecs.length && !namedSpecs.length) {
      // Should not happen, but avoid generating invalid code
      return '';
    }
    parts.push(' from ', quote, groupModule, quote, ';');
    return parts.join('');
  }

  return {
    getQuoteChar,
    groupImportSpecifiersByTarget,
    hasAnyMappedTarget,
    buildImportTextForGroup,
  };
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: false,
    docs: {
      description:
        'Rewrites legacy Ember Data import module specifiers to their modern replacements using an embedded mapping.',
      recommended: false,
      url: 'https://github.com/warp-drive-data/warp-drive/tree/main/packages/eslint-plugin-warp-drive/docs/no-legacy-imports.md',
    },
    messages: {
      [RULE_ID]: 'Rewrite import from "{{from}}" to modern modules.',
    },
  },

  create(context) {
    const helpers = createHelpers(context);

    function handleImportDeclaration(node) {
      if (!node.source || !node.source.value || !node.specifiers || node.specifiers.length === 0) return;
      const fromModule = String(node.source.value);

      const groups = helpers.groupImportSpecifiersByTarget(fromModule, node.specifiers);
      const hasMapped = helpers.hasAnyMappedTarget(groups, fromModule);
      if (!hasMapped) return;

      const groupKeys = Object.keys(groups);
      const quote = helpers.getQuoteChar(node);

      // Simple case: all specifiers map to a single replacement module and none remain at original
      if (groupKeys.length === 1 && groupKeys[0] !== fromModule) {
        const target = groupKeys[0];
        context.report({
          node,
          messageId: RULE_ID,
          data: { kind: 'import', from: fromModule },
          fix(fixer) {
            const newText = `${quote}${target}${quote}`;
            return fixer.replaceText(node.source, newText);
          },
        });
        return;
      }

      // Split into multiple imports
      context.report({
        node,
        messageId: RULE_ID,
        data: { kind: 'import', from: fromModule },
        fix(fixer) {
          const pieces = [];
          for (const mod of groupKeys) {
            const text = helpers.buildImportTextForGroup(mod, groups[mod], quote);
            if (text) pieces.push(text);
          }
          const replacement = pieces.join('\n');
          return fixer.replaceText(node, replacement);
        },
      });
    }

    return {
      ImportDeclaration: handleImportDeclaration,
    };
  },
};
