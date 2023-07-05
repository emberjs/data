#### Testing EmberData source directly in your Application

You can use package linking to test checkouts of ember-data against your application locally. This applies to consuming ember-data directly within an ember application. It will not work in your application if you are consuming ember-data through an addon (transitive dependency problem). This approach also presumes consuming all of ember-data.

1. clone this repository or another fork
2. install dependencies: `pnpm install`
3. change into the `ember-data` package directory `cd packages/-ember-data`

If using `pnpm`

1. run `link`. `pnpm link -g`
2. `cd` into your application
3. run `pnpm link ember-data`

If you don't use pnpm in your application, using the appropriate `yarn link` and `npm link` commands within the respective directories for the project and your app may work.

You can link to individual packages within this monorepo as well, doing so however is likely to be brittle. If you need to test individual packages against your application and linking does not work
you may run `node ./scripts/packages-for-commit.js` to generate tarballs that can be utilized locally
on your machine. Read pnpm/yarn/npm docs as appropriate for how to install from tarball.

Once you have linked EmberData to your application, you can run `ember serve` as usual
in your application. You should see something like the following printed to your terminal:

```
some-app $ ember serve

Missing symlinked pnpm packages:
Package: ember-data
  * Specified: ~3.15.0
  * Symlinked: 3.17.0-alpha.1


Build successful (41237ms) – Serving on http://localhost:4200/
...
```
