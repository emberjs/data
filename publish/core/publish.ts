import { flags_config } from '../utils/flags-config';
import { parseRawFlags } from '../utils/parse-args';
import { getGitState } from '../utils/git';
import { printHelpDocs } from '../help/docs';
import { bumpAllPackages, restorePackagesForDryRun } from './publish/steps/bump-versions';
import { generatePackageTarballs } from './publish/steps/generate-tarballs';
import { printStrategy } from './publish/steps/print-strategy';
import { applyStrategy, gatherPackages, loadStrategy } from './publish/steps/generate-strategy';
import { confirmStrategy } from './publish/steps/confirm-strategy';
import { publishPackages } from './publish/steps/publish-packages';

export async function executePublish(args: string[]) {
  // get user supplied config
  const config = await parseRawFlags(args, flags_config);

  if (config.full.get('help')) {
    return printHelpDocs(args);
  }

  const dryRun = config.full.get('dry_run') as boolean;

  // get git info
  const gitInfo = await getGitState(config.full);

  // get configured strategy
  const strategy = await loadStrategy();

  // get packages
  const packages = await gatherPackages(strategy.config);

  // get applied strategy
  const applied = await applyStrategy(config.full, gitInfo, strategy, packages);

  // print strategy to be applied
  await printStrategy(config.full, applied);

  await confirmStrategy();

  // TODO: Generate Release Notes / PR flow?
  // Ideally we do per-package changelogs + a root changelog thats rolls up
  // those changes into one set of release notes.
  // this step probably would create an artifact like .changelog.json
  // and open a PR, and then early exit. Then if the script is run again
  // it would check if the PR is merged and if so it would continue.
  // await generateReleaseNotes(config, packages, applied.public_pks);
  // await confirmReleaseNotesMerged();

  // Bump package.json versions & commit/tag
  // ========================
  await bumpAllPackages(config.full, packages, applied.all);

  if (dryRun) await restorePackagesForDryRun(packages, applied.all);

  // Generate Tarballs in tmp/tarballs/<root-version>
  // Having applied the types publishing strategy "just in time"
  // ========================
  if (config.full.get('pack')) await generatePackageTarballs(config.full, packages, applied.public_pks);

  // Publish to NPM registry
  // ========================
  if (config.full.get('publish')) await publishPackages(config.full, packages, applied.public_pks);
}
