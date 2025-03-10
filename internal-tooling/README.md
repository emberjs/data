# @warp-drive/internal-tooling

This internal (private) project provides a number of tooling scripts
for use with the monorepo.

These scripts can be run as bin-scripts from root.

## bun sync-logos

Will sync the logo directory from root to each public package and
ensure that the logos directory is included in published files.

## bun sync-license

Will sync the LICENSE.md file from root to each public package and
ensure that the license is both set to `MIT` in the package.json and
included in the published files for each package.

## bun sync-references

Will ensure that `paths` and `references` are both correctly specified
in tsconfig.json for any other workspace package specified by package.json
as a dependency, peer-dependency, or dev-dependency.

Will also ensure the proper settings for composite etc. are in use.

For packages that should emit types (any non-test app package) it will
ensure that the declarationDir is added to the files array in package.json.
