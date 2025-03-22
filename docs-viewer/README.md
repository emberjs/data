# Internal Docs Viewer

This package provides a script for quickly setting up the various repositories
needed to preview the API docs defined in the source-code of this project and
linking them together properly.

The scripts can be run from the project root or from within this directory.

### `bun preview-api-docs`

This will update the various repositories to their latest commit (or clone the
repo if needed) in the `docs-viewer/projects` directory. This directory is
git-ignored.

It will then generate necessary symlinks, run the docs build script, and start
the api-docs viewer app.

Once the app is running, changes to the docs do not automatically rebuild.
The command `rebuild-api-docs` will update the docs data for the running app.

### `bun rebuild-api-docs`

This will rebuild the api-docs data consumed by the api-docs viewer application.

This must be run manually after any changes to api documentation for them to be
available to a running instance of the api docs application. If the app is not
currently running, this command is unneeded as `preview-api-docs` will also do
an initial build of the docs.

