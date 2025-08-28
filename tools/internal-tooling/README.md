# @warp-drive/internal-tooling

This internal (private) project provides a number of tooling scripts
for use with the monorepo.

These scripts can be run as bin-scripts from root.

### sync-all

```sh
bun sync-all
```

Will run all of the other available scripts.

### sync-logos

```sh
bun sync-logos
```

Will sync the logo directory from root to each public package and
ensure that the logos directory is included in published files.

### sync-license

```sh
bun sync-license
```

Will sync the LICENSE.md file from root to each public package and
ensure that the license is both set to `MIT` in the package.json and
included in the published files for each package.

### sync-references

```sh
bun sync-references
```

Will ensure that `paths` and `references` are both correctly specified
in tsconfig.json for any other workspace package specified by package.json
as a dependency, peer-dependency, or dev-dependency.

Will also ensure the proper settings for composite etc. are in use.

For packages that should emit types (any non-test app package) it will
ensure that the declarationDir is added to the files array in package.json.

### sync-scripts

```sh
bun sync-scripts
```

Will ensure that scripts enumerated in package.json which should be the same
throughout the monorepo match expected configuration.
