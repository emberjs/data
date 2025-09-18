old packages are still in the `packages/` directory
new packages are in the `warp-drive-packages/` directory

the standard should be 5.5 (because we shipped new packages in 5.6)
so basically whatever modules (public or private) were expoed in 5.5 + whatever exports those had needs a mapping in a json file back to the new token and new module it now comes from

if any module or export in a module that existed in 5.5 no longer exists in 5.6+, we want to find that out and fix that too
as part of this, it may be beneficial to remove the `export *` from the modules in the old packages that used that and manually type out each export that should be there, so that its exact and if we ever change stuff we catch it

In the style of original RFC https://github.com/ember-data/ember-data-rfc395-data/blob/master/mappings.json

Improved version should include types exports, this is just an example and it may not be right, but the idea is some exports / re-exports are only types and that's necessary for tooling to know

```json
{
  "module": "@warp-drive/core-types/identifier",
  "export": "StableRecordIdentifier",
  "typeOnly": true,
  "replacement": {
    "module": "@warp-drive/core/types/identifier",
    "export": "ResourceKey"
  }
}
```

basically this map should be from 5.5 to PUPS now. So if in 5.5 module X has export N, the replacement is where you would find N now
sometimes that'll be a whole new name and new module, for instance

```json
{
  "module": "@warp-drive/core-types/identifier",
  "export": "StableRecordIdentifier",
  "typeOnly": true,
  "replacement": {
    "module": "@warp-drive/core/types/identifier",
    "export": "ResourceKey"
  }
},
{
  "module": "@ember-data/adapter",
  "export": "default",
  "typeOnly": false,
  "replacement": {
    "module": "@warp-drive/legacy/adapter",
    "export": "Adapter",
    "typeOnly": false
  }
}
```
