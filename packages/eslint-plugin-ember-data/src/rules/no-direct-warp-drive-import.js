'use strict';

// eslint-disable-next-line n/no-unpublished-require
const MAPPINGS = require('../../../libraries/warp-drive/mappings.json');
const WarpDrivePackages = ['ember-data', 'warp-drive'];

const WarpDriveOrgs = [
	'@ember-data',
	'@ember-data-types',
	'@ember-data-mirror',
	'@warp-drive',
	'@warp-drive-types',
	'@warp-drive-mirror',
];

function isBannedWarpDriveImport(imported) {
	for (const pkg of WarpDrivePackages) {
		if (imported === pkg || imported.startsWith(pkg + '/')) {
			return true;
		}
	}
	return false;
}

function isWarpDriveImport(imported) {
	for (const org of WarpDriveOrgs) {
		if (imported.startsWith(org + '/')) {
			return true;
		}
	}
	return false;
}

function convertToAuditBoardImport(imported) {
	const parts = imported.split('/');
	const [org, name] = parts;
	const packageName = `${org}/${name}`;
	const version = MAPPINGS.v0.includes(packageName)
		? 'v0'
		: MAPPINGS.v1.includes(packageName)
			? 'v1'
			: MAPPINGS.v2.includes(packageName)
				? 'v2'
				: 'none';

	if (version === 'none') {
		throw new Error(`Could not find an '@auditboard/warp-drive' mapping for ${packageName}}`);
	}

	const remainder = parts.slice(2).join('/');

	// e.g. @warp-drive/foo => @auditboard/warp-drive/v2/foo
	return remainder
		? `'@auditboard/warp-drive/${version}/${name}/${remainder}'`
		: `'@auditboard/warp-drive/${version}/${name}'`;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	meta: {
		docs: {
			description:
				'disallow `import` / re-export directly from EmberData/WarpDrive projects in favor of @auditboard/warp-drive',
			recommended: true,
		},
		type: 'problem',
		fixable: 'code',
		schema: [],
		messages: {
			bannedImport: `Importing from '{{ warpDriveName }}' is not allowed. Use a more specific import from '@auditboard/warp-drive' instead.`,
			invalidImport: `Import from '{{ warpDriveName }}' should be changed to import from '{{ auditboardName }}'`,
		},
	},
	create(context) {
		function handleSpecifier(node) {
			const imported = node.source?.value;

			// exports can occur with values, not just from another module
			if (!imported) {
				return;
			}

			if (!isWarpDriveImport(imported)) {
				return;
			}

			if (isBannedWarpDriveImport(imported)) {
				context.report({
					node: node.source,
					messageId: 'bannedImport',
					data: {
						warpDriveName: imported,
					},
				});
			}

			const replaceWith = convertToAuditBoardImport(imported);
			context.report({
				node: node.source,
				messageId: 'invalidImport',
				data: { warpDriveName: imported, auditboardName: replaceWith },
				*fix(fixer) {
					yield fixer.replaceText(node.source, replaceWith);
				},
			});
		}

		return {
			ImportDeclaration: handleSpecifier,
			ExportAllDeclaration: handleSpecifier,
			ExportNamedDeclaration: handleSpecifier,
		};
	},
};
