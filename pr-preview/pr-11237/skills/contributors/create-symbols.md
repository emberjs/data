---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/skills/contributors/create-symbols.md
---
# Create Symbols With getOrSetGlobal

Use this skill whenever you add a symbol to a ***Warp*Drive** package, key an object or interface
by one, or a build fails with `TS9038: Computed property names on class or object literals cannot
be inferred with --isolatedDeclarations`.

## Steps

1. Create the symbol with `getOrSetGlobal`, never with a bare module-level `Symbol()`. Import it
   from `warp-drive-packages/core/src/types/-private.ts` (inside core, use a relative import from
   the module you are editing). Test builds can load two copies of a package (see the comments at
   the top of that file), and each copy would otherwise mint its own symbol, so a key one copy
   sets is invisible to the other. Add the key to the `GlobalKey` union in the same file, under a
   comment naming the module that owns it. Use `getOrSetUniversal` and the `UniversalKey` union
   instead only when the symbol must also match across mirror packages. Mirror packages are copies
   of our packages published under the `@warp-drive-mirror/*` scope, and each package name gets its
   own global cache. The request flags in `warp-drive-packages/core/src/types/request.ts` are an
   example.
2. Annotate the constant with the string-literal type `'___(unique) Symbol(<Key>)'`, which is the
   type the helper returns for a symbol:

   ```ts
   export const Context: '___(unique) Symbol(Context)' = getOrSetGlobal('Context', Symbol('Context'));
   ```

   Don't let TypeScript infer `unique symbol`. Our declaration rollup emits one types file per
   entry point, which would give every entry point its own incompatible copy of the symbol's type;
   the comment at the top of `warp-drive-packages/core/src/reactive/-private/symbols.ts` explains
   why. The string-literal type works anywhere a symbol does: as an interface key
   (`[Context]: Source`), in element access, and as a computed key in an object literal.
3. Read symbol-keyed state through an accessor helper when the module that owns the symbol
   exports one, not through a cast. For example, use `withSignalStore(obj)` rather than
   `(obj as unknown as { [Signals]: SignalStore })[Signals]`. A cast compiles even when the object
   has no such member, so it hides exactly the mistake the type exists to catch.
4. Give every exported object literal that has a computed key an explicit type annotation:

   ```ts
   export interface ReactiveThingProto {
     [Destroy](): void;
     fetch(): Promise<void>;
   }

   export const ReactiveThingProto: ReactiveThingProto = {
     [Destroy]() {},
     async fetch() {},
   };
   ```

   Without the annotation the package build fails with `TS9038`, because isolated declarations
   cannot infer a computed key. This happens for any computed key, however the symbol is typed, so
   retyping the symbol does not fix it. Don't work around it by un-exporting the object or copying
   its methods into another module either; the copies drift apart.
5. Keep these symbols private. Don't export one from a public entry point or tag it `@public`
   unless it is meant to be API, and if it is, document it as described in
   [Write Documentation](./write-documentation.md).
