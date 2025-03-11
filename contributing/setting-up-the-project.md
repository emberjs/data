# Setting Up The Project

## Setup Volta

If you are not already using [⚡️ volta](https://volta.sh/) or have a version older than `1.1.1` you will want to begin by [installing it](https://docs.volta.sh/guide/getting-started).

For package management, the project uses [PNPM](https://pnpm.io/).

Volta will manage `node` and `pnpm` versions for you, but for [PNPM there is one more step](https://docs.volta.sh/advanced/pnpm):

To your shell profile you will want to add the following.

```sh
export VOLTA_FEATURE_PNPM=1;
```

> **Note** if you have previously installed pnpm globally via other means you should uninstall it from all other locations first. You may also need to uninstall nvm or other node version managers if they turn out to conflict.

## Install bun.sh

If you don't already have [bun.sh](https://bun.sh/)
For MacOS or Linux
```sh
curl -fsSL https://bun.sh/install | bash
```
can be done using homebrew, npm or Docker (User choice) checkout installation [doc](https://bun.sh/docs/installation#macos-and-linux)

For Windows
```sh
# WARNING: No stability is guaranteed on the experimental Windows builds
powershell -c "irm bun.sh/install.ps1|iex"
```
Installation [doc](https://bun.sh/docs/installation#windows)

## Install certificate packages

Install mkcert using homebrew on MacOS or Linux
```sh
brew install mkcert
```
can be done using Chocolatey, Scoop or MacPorts (User choice) checkout installation [doc][https://github.com/FiloSottile/mkcert?tab=readme-ov-file#installation]

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
git clone git@github.com:emberjs/data.git
```

## Install the project dependencies

```sh
cd data && pnpm install
```

Currently the install command is also what builds all of the individual packages in the monorepo and hardlinks them together, so if making changes to one package that need to be used by another you will need to rerun `pnpm install` for the changes to be picked up.

## Create certificates

```sh
pnpm dlx @warp-drive/holodeck ensure-cert
```

## Building the project

The project's packages will build whenever `pnpm install` is run.

## Run some commands

Generally test and lint commands can be found in the `"scripts"` section of the root `package.json` manifest. Individual packages or test packages have additional commands in the `"scripts"` section of their own `package.json` manifest as well.

Any command in script can be run using `pnpm` from the directory of that manifest. For instance, to run linting from the root: `pnpm lint`

Github Actions workflows will generally use these same commands.
