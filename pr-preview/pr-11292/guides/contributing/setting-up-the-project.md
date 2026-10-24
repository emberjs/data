---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/guides/contributing/setting-up-the-project.md
description: >-
  Set up a WarpDrive contributor checkout: install mise, pnpm, and mkcert, run
  `pnpm install`, create holodeck certs, and use `pnpm start` plus `pnpm sync`
  while developing.
---

# Setting Up The Project

## Setup mise

If you don't already have [mise](https://mise.jdx.dev/) you will want to begin by [installing it](https://mise.jdx.dev/getting-started.html) and adding its shell activation to your profile.

For package management, the project uses [PNPM](https://pnpm.io/). The repo's `mise.toml` pins the `node`, `pnpm`, and `bun` versions we use; once mise is activated in your shell, run `mise install` from the project root to fetch them.

> **Note** if you have previously installed pnpm, node, or bun globally via other means (including Volta or bun's own installer) you should uninstall them from all other locations first, as they can conflict with mise's shims.

## Install certificate packages

Install mkcert using homebrew on MacOS or Linux

```sh
brew install mkcert
```

can be done using Chocolatey, Scoop or MacPorts (User choice) checkout installation \[doc]\[https://github.com/FiloSottile/mkcert?tab=readme-ov-file#installation]

For Firefox users, Mozilla NSS is also needed
Using homebrew on MacOS

```sh
brew install nss
```

Or apt on Linux

```sh
sudo apt install libnss3-tools
```

but can also be done using other methods.

## Clone the repository

```sh
git clone git@github.com:warp-drive-data/warp-drive.git
```

## Install the project dependencies

```sh
cd warp-drive && pnpm install
```

Currently the install command is also what builds all of the individual packages in the monorepo and hardlinks them together, so if making changes to one package that need to be used by another you will need to rerun `pnpm install` for the changes to be picked up.

## Create certificates

```sh
pnpm dlx @warp-drive/holodeck ensure-cert
```

## Building the project

The project's packages will build whenever `pnpm install` is run. They can be rebuilt by running `pnpm prepare`.

Both `install` and `prepare` will ensure turbo cache is ignored so that pnpm will automatically update "hardlinks" for
the build output files in the node\_modules directory of the various other packages and test apps that depend upon the package.

However, this is pretty slow for development, so a fast albeit slightly manual approach is available for development
by running the below commands in order:

From the project root:

* install: `pnpm install` - installs all dependencies and sets up initial hardlinks
* start: `pnpm start` - starts the build for every public package in watch mode

Then, from an individual test app:

* `pnpm start` - starts the build for test assets in watch mode
* `pnpm test:start` - launches a test server (and by opens a browser window for debugging them)

Because the project uses hardlinks, even though the packages are rebuilding, the test apps won't be able
to see the results of the change in many scenarios unless the hardlinks are regenerated.

At anypoint, run `pnpm sync` from the root to regenerate the hardlinks. The test app server may
pick up this change automatically, but if it does not saving any file (even without changing it)
in the test app will trigger a rebuild.

## Run some commands

Generally test and lint commands can be found in the `"scripts"` section of the root `package.json` manifest. Individual packages or test packages have additional commands in the `"scripts"` section of their own `package.json` manifest as well.

Any command in script can be run using `pnpm` from the directory of that manifest. For instance, to run linting from the root: `pnpm lint`

Github Actions workflows will generally use these same commands.
