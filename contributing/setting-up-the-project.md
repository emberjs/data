# Setting Up The Project

1. Setup Volta

If you are not already using [⚡️ volta](https://volta.sh/) or have a version older than `1.1.1` you will want to begin by [installing it](https://docs.volta.sh/guide/getting-started).

For package management, the project uses [PNPM](https://pnpm.io/).

Volta will manage `node` and `pnpm` versions for you, but for [PNPM there is one more step](https://docs.volta.sh/advanced/pnpm):

To your shell profile you will want to add the following.

```sh
export VOLTA_FEATURE_PNPM=1;
```

> **Note** if you have previously installed pnpm globally via other means you should uninstall it from all other locations first. You may also need to uninstall nvm or other node version managers if they turn out to conflict.

2. Clone the repository

```sh
git clone git@github.com:emberjs/data.git
```

3. Install the project dependencies

```sh
cd data && pnpm install
```

Currently the install command is also what builds all of the individual packages in the monorepo and hardlinks them together, so if making changes to one package that need to be used by another you will need to rerun `pnpm install` for the changes to be picked up.

4. Run some commands

Generally test and lint commands can be found in the `"scripts"` section of the root `package.json` manifest. Individual packages or test packages have additional commands in the `"scripts"` section of their own `package.json` manifest as well.

Any command in script can be run using `pnpm` from the directory of that manifest. For instance, to run linting from the root: `pnpm lint`

Github Actions workflows will generally use these same commands.
