import path from 'path';
// @ts-expect-error missing from Bun types
import { globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DefaultOpenGroups: string[] = [];
const AlwaysOpenGroups: string[] = ['configuration.setup'];

function segmentToTitle(segment: string, prevSegment: string | null) {
  if (segment === 'index.md') {
    if (!prevSegment || prevSegment === '1-the-manual') return 'Introduction';
    segment = prevSegment;
  }
  const value = segment.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  if (!isNaN(Number(value[0]))) {
    value.shift();
  }
  const result = value.join(' ').replace('.md', '');

  return result === 'Index' ? 'Introduction' : result;
}

function segmentToNicePath(segment: string) {
  const value = segment.split('-');
  if (!isNaN(Number(value[0]))) {
    value.shift();
  }
  return value.join('-').replace('.md', '');
}

function segmentToIndex(segment: string, index: number) {
  if (segment === 'index.md') {
    return 0;
  }
  const value = segment.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  if (!isNaN(Number(value[0]))) {
    return Number(value[0]);
  }

  return index;
}

export async function getGuidesStructure(withRewrites = false) {
  const GuidesDirectoryPath = path.join(__dirname, '../docs.warp-drive.io/guides');
  const glob = globSync('**/*.md', { cwd: GuidesDirectoryPath });
  const rewritten: Record<string, string> = {};
  const groups: Record<string, any> = {
    manual: {
      text: 'The Manual',
      index: 0,
      collapsed: true,
      items: {},
    },
  };

  for (const filepath of glob) {
    const rewrittenPath = [];
    const segments = filepath.split(path.sep);
    const lastSegment = segments.pop()!;

    if (lastSegment.startsWith('0-')) {
      // skip hidden files
      continue;
    }

    // for the root, we consider any numbered directory or file as part of the manual
    // and anything else as top-level
    // we will probably want an ordering mechanism for non-manual files at some point
    const firstChar = (segments[0] || lastSegment).charAt(0);
    let group = groups;
    let parent = null;
    if (!isNaN(Number(firstChar))) {
      group = groups.manual.items;
    }

    for (let i = 0; i < segments.length; i++) {
      const prevSegment = i > 0 ? segments[i - 1] : null;
      const segment = segments[i];
      const niceSegment = segmentToNicePath(segment);
      const trueSegment = withRewrites ? niceSegment : segment;
      rewrittenPath.push(niceSegment);
      const key = rewrittenPath.join('.');
      const collapsed = AlwaysOpenGroups.includes(key) ? null : DefaultOpenGroups.includes(key) ? false : true;

      // setup a nested segment if we don't already have one
      if (!group[trueSegment]) {
        const existing = Object.keys(group);
        group[trueSegment] = {
          text: segmentToTitle(segment, prevSegment),
          index: segmentToIndex(segment, existing.length),
          collapsed,
          items: {},
        };
      }

      parent = group[trueSegment];
      group = group[trueSegment].items;
    }

    // at the base level, if we have not iterated into a sub-group we
    // must be a file. If we are `index.md` we add to the manual, else
    // we assume a top-level file
    if (group === groups && lastSegment === 'index.md') {
      parent = groups.manual;
      group = groups.manual.items;
    }

    const prevSegment = segments.length > 0 ? segments.at(-1) : null;
    const niceSegment = segmentToNicePath(lastSegment);
    const trueSegment = withRewrites ? niceSegment : lastSegment;
    rewrittenPath.push(niceSegment);

    const rewrittenUrl = `/guides/${rewrittenPath.join('/')}`;
    // in order for index urls to highlight in the nav they can't have "index" in the url path
    const realUrl = `/guides/${filepath.endsWith('index.md') ? filepath.replace('/index.md', '') : filepath.replace('.md', '')}`;

    // add the last segment to the group
    const existing = Object.keys(group);
    if (group !== groups && lastSegment === 'index.md') {
      // if we are an index file, we set the link on the parent
      // this seems to work even though there's an issue
      // that says it doesn't: https://github.com/vuejs/vitepress/issues/2989
      // however:
      // when doing this, the "next page" feature breaks for
      // these pages, so for now we just do non-clickable headers.
      //
      parent.link = withRewrites ? rewrittenUrl : realUrl;
    }
    group[trueSegment] = {
      text: segmentToTitle(lastSegment, prevSegment),
      index: segmentToIndex(lastSegment, existing.length),
      link: withRewrites ? rewrittenUrl : realUrl,
    };

    rewritten[`${realUrl + '.md'}`] = rewrittenUrl + '.md';
  }

  // deep iterate converting items objects to arrays
  const result = deepConvert(groups);
  // console.log(JSON.stringify(result, null, 2));
  // console.log(JSON.stringify(rewritten, null, 2));
  const structure = { paths: result, rewritten };

  writeFileSync(
    path.join(__dirname, '../docs.warp-drive.io/guides/nav.json'),
    JSON.stringify(structure, null, 2),
    'utf-8'
  );
  await import(path.join(__dirname, '../docs.warp-drive.io/guides/nav.json'), {
    with: { type: 'json' },
  });
  return { paths: result, rewritten };
}

function deepConvert(obj: Record<string, any>) {
  const groups = Array.from(Object.values(obj));

  for (const group of groups) {
    if (group.items) {
      group.items = deepConvert(group.items);
      if (!group.link && !group.items[0].items) {
        group.link = group.items[0].link;
      }
    }
  }
  return groups.sort((a, b) => {
    return a.index < b.index ? -1 : a.index > b.index ? 1 : 0;
  });
}

type SidebarItem = { text: string; items?: SidebarItem[]; link?: string; collapsed?: boolean };

const OLD_PACKAGES = [
  '@ember-data/adapter',
  '@ember-data/active-record',
  '@ember-data/debug',
  '@ember-data/legacy-compat',
  '@ember-data/model',
  '@ember-data/json-api',
  '@ember-data/store',
  '@ember-data/graph',
  '@ember-data/request',
  '@ember-data/request-utils',
  '@ember-data/rest',
  '@ember-data/serializer',
  '@ember-data/tracking',
  '@warp-drive/core-types',
  '@warp-drive/build-config',
  '@warp-drive/schema-record',
];

export function splitApiDocsSidebar(sidebar: SidebarItem[]) {
  const oldPackages: SidebarItem[] = [];
  const newPackages: SidebarItem[] = [];

  for (const item of sidebar) {
    if (OLD_PACKAGES.includes(item.text)) {
      oldPackages.push(item);
    } else {
      newPackages.push(item);
    }
  }

  return {
    oldPackages,
    newPackages,
  };
}

export function asApiDocsSidebar(o: unknown): { oldPackages: SidebarItem[]; newPackages: SidebarItem[] } {
  return o as { oldPackages: SidebarItem[]; newPackages: SidebarItem[] };
}

const HOISTED_PRIMITIVES = ['Classes', 'Variables', 'Functions'];
const FILTERED_NAV_ITEMS = ['Interfaces', 'Type Aliases'];
const META_PACKAGES = ['ember-data', 'warp-drive', 'eslint-plugin-ember-data', 'eslint-plugin-warp-drive'];

function cleanSidebarItems(items: SidebarItem[], isPrimitive = false): SidebarItem[] {
  const newItems: SidebarItem[] = [];
  let submodules: SidebarItem[] = [];

  const hoisted: SidebarItem = { text: 'exports', items: [] };

  for (const item of items) {
    if (FILTERED_NAV_ITEMS.includes(item.text)) {
      // skip filtered items
      continue;
    }

    if (HOISTED_PRIMITIVES.includes(item.text)) {
      hoisted.items!.push(...cleanSidebarItems(item.items || [], true));
      continue;
    }

    if (item.text === 'Modules') {
      // hoist modules up
      submodules = cleanSidebarItems(item.items || []);
      continue;
    }

    if (!META_PACKAGES.includes(item.text) && !item.text.startsWith('@') && !isPrimitive) {
      item.text = '/' + item.text;
    }

    if (item.items) {
      item.items = cleanSidebarItems(item.items);
    }
    newItems.push(item);
    continue;
  }

  if (submodules.length === 0) {
    return newItems;
  }

  if (hoisted.items!.length > 0) {
    // if we have hoisted items, we add them to the new items
    newItems.unshift(hoisted);
  }

  return newItems.concat(submodules);
}

const DOC_FRONTMATTER = `---
outline:
  level: [2, 3]
---
`;
const ApiDocumentation = `# API Docs\n\n`;

export async function postProcessApiDocs() {
  const dir = path.join(__dirname, '../tmp/api');
  const outDir = path.join(__dirname, '../docs.warp-drive.io/api');
  mkdirSync(outDir, { recursive: true });

  // remove the `_media` directory that typedoc generates
  rmSync(path.join(dir, '_media'), { recursive: true, force: true });

  // cleanup and prepare the sidebar items
  const sidebarPath = path.join(outDir, 'typedoc-sidebar.json');
  const navStructure = JSON.parse(readFileSync(path.join(dir, 'typedoc-sidebar.json'), 'utf-8')) as SidebarItem[];
  const sidebar = splitApiDocsSidebar(cleanSidebarItems(navStructure));
  writeFileSync(sidebarPath, JSON.stringify(sidebar, null, 2), 'utf-8');

  // get the package list
  const NewPackages: string[] = [];
  const OldPackages: string[] = [];
  for (const item of sidebar.newPackages) {
    NewPackages.push(`- [${item.text}](${item.link!})`);
  }
  for (const item of sidebar.oldPackages) {
    OldPackages.push(`- [${item.text}](${item.link!})`);
  }

  // generate the API documentation
  const apiDocumentation = `${ApiDocumentation}\n\n## Main Packages\n\n${NewPackages.join('\n')}\n\n## Legacy Packages\n\n${OldPackages.join('\n')}\n\n`;

  // copy the rest of the files
  const files = globSync('**/*.md', { cwd: dir, nodir: true });
  for (const file of files) {
    if (file === 'index.md') {
      // Generate a custom index.md file
      writeFileSync(path.join(outDir, 'index.md'), apiDocumentation, 'utf-8');
      continue;
    }
    const content = readFileSync(path.join(dir, file), 'utf-8');
    const outFile = path.join(outDir, file);
    mkdirSync(path.dirname(outFile), { recursive: true });

    let newContent = content;

    // insert frontmatter
    newContent = DOC_FRONTMATTER + newContent;

    // if the content has a modules list, we remove it
    if (newContent.includes('## Modules')) {
      newContent = newContent.slice(0, newContent.indexOf('## Modules'));
    }

    // if the content has `Interface` or `Type Aliases` we collapse them
    const hasInterfaces = newContent.includes('## Interfaces');
    const hasTypeAliases = newContent.includes('## Type Aliases');
    if (hasInterfaces) {
      newContent = newContent.replace('## Interfaces', '## Types');
      newContent = newContent.replace('\n\n## Type Aliases\n', '');
    } else if (hasTypeAliases) {
      newContent = newContent.replace('## Type Aliases', '## Types');
    }

    // if the content has `Properties` and `Accessors` we collapse them
    const hasProperties = newContent.includes('## Properties');
    const hasAccessors = newContent.includes('## Accessors');
    if (hasAccessors) {
      if (hasProperties) {
        newContent = newContent.replace('\n\n## Accessors\n', '');
      } else {
        newContent = newContent.replace('## Accessors', '## Properties');
      }
    }

    writeFileSync(outFile, newContent, 'utf-8');
  }

  await import(sidebarPath, {
    with: { type: 'json' },
  });

  return sidebar;
}
