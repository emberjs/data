/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
"use strict"

const path = require("path")
const { CALL, ReferenceTracker, getStringIfConstant } = require("eslint-utils")
const resolve = require("resolve")
const getResolvePaths = require("./get-resolve-paths")
const getTryExtensions = require("./get-try-extensions")
const ImportTarget = require("./import-target")
const stripImportPathParams = require("./strip-import-path-params")

/**
 * Gets a list of `require()` targets.
 *
 * Core modules of Node.js (e.g. `fs`, `http`) are excluded.
 *
 * @param {RuleContext} context - The rule context.
 * @param {boolean} includeCore - The flag to include core modules.
 * @returns {ImportTarget[]} A list of found target's information.
 */
module.exports = function getRequireTargets(context, includeCore) {
    const retv = []
    const basedir = path.dirname(path.resolve(context.getFilename()))
    const paths = getResolvePaths(context)
    const extensions = getTryExtensions(context)
    const options = { basedir, paths, extensions }
    const tracker = new ReferenceTracker(context.getScope())
    const references = tracker.iterateGlobalReferences({
        require: {
            [CALL]: true,
            resolve: { [CALL]: true },
        },
    })

    for (const { node } of references) {
        const targetNode = node.arguments[0]
        const rawName = getStringIfConstant(targetNode)
        const name = rawName && stripImportPathParams(rawName)
        if (name && (includeCore || !resolve.isCore(name))) {
            retv.push(new ImportTarget(targetNode, name, options))
        }
    }

    return retv
}
