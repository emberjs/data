/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
"use strict"

const path = require("path")
const resolve = require("resolve")
const getResolvePaths = require("./get-resolve-paths")
const getTryExtensions = require("./get-try-extensions")
const ImportTarget = require("./import-target")
const stripImportPathParams = require("./strip-import-path-params")

const MODULE_TYPE = /^(?:Import|Export(?:Named|Default|All))Declaration$/u

/**
 * Gets a list of `import`/`export` declaration targets.
 *
 * Core modules of Node.js (e.g. `fs`, `http`) are excluded.
 *
 * @param {RuleContext} context - The rule context.
 * @param {ASTNode} programNode - The node of Program.
 * @param {Object} [options] - The flag to include core modules.
 * @param {boolean} [options.includeCore] - The flag to include core modules.
 * @param {number} [options.optionIndex] - The index of rule options.
 * @returns {ImportTarget[]} A list of found target's information.
 */
module.exports = function getImportExportTargets(
    context,
    programNode,
    { includeCore = false, optionIndex = 0 } = {}
) {
    const retv = []
    const basedir = path.dirname(path.resolve(context.getFilename()))
    const paths = getResolvePaths(context, optionIndex)
    const extensions = getTryExtensions(context, optionIndex)
    const options = { basedir, paths, extensions }

    for (const statement of programNode.body) {
        // Skip if it's not a module declaration.
        if (!MODULE_TYPE.test(statement.type)) {
            continue
        }

        // Gets the target module.
        const node = statement.source
        const name = node && stripImportPathParams(node.value)
        if (name && (includeCore || !resolve.isCore(name))) {
            retv.push(new ImportTarget(node, name, options))
        }
    }

    return retv
}
