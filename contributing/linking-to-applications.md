#### Testing WarpDrive source directly in your Application

You can use package linking to test checkouts of WarpDrive against your application locally. This applies to consuming WarpDrive directly within an ember application. It will not work in your application if you are consuming WarpDrive through an addon (transitive dependency problem). This approach also presumes consuming all of WarpDrive.

1. clone this repository or another fork
2. install dependencies: `pnpm install`
3. change into the `ember-data` package directory `cd packages/-ember-data`

If using `pnpm`

1. run `link`. `pnpm link -g`
2. `cd` into your application
3. run `pnpm link ember-data`

If you don't use pnpm in your application, using the appropriate `yarn link` and `npm link` commands within the respective directories for the project and your app may work.

Once you have linked WarpDrive to your application, you can run `ember serve` as usual in your application.
