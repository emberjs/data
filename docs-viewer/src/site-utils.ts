import path from 'path';
import { globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import fm from 'front-matter';

const DefaultOpenGroups: string[] = [];
const AlwaysOpenGroups: string[] = [];

function segmentToTitle(segment: string, prevSegment: string | null) {
  if (segment === 'index.md') {
    if (!prevSegment) return 'Introduction';
    segment = prevSegment;
  }
  const value = segment.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  if (!isNaN(Number(value[0]))) {
    value.shift();
  }
  const result = value.join(' ').replace('.md', '');

  return result === 'Index' ? 'Introduction' : result;
}

interface WarpDriveFrontMatter {
  categoryTitle?: string;
  title?: string;
  categoryOrder?: number;
  order?: number;
  draft?: boolean;
  collapsed?: boolean;
}
interface GuideGroup {
  /**
   * The Text To Display
   */
  text: string;
  /**
   * The Path For This group
   * "On Disc".
   */
  path: string;
  /**
   * The URL Slug For This group
   * if different from the path.
   *
   * This is currently unused but is set
   * by the frontmatter of an `index.md` file
   * in the directory.
   */
  slug: string;
  /**
   * This will be the categoryIndex specified by
   * the frontmatter of an `index.md` file in the directory.
   *
   * Else it will be set to the next open index available
   * once "known" indeces have been assigned.
   */
  index: number | null;
  /**
   * Whether the directory should default to open or closed.
   *
   * This is set by the frontmatter of an `index.md` file in the directory.
   * else by config above in this file, and defaults to `true`.
   */
  collapsed: boolean | null;
  /**
   * The child items/groups of this group, if any.
   */
  items: Record<string, GuideGroup>;
  /**
   *
   */
  link?: string;
}

export async function getGuidesStructure() {
  const GuidesDirectoryPath = path.join(__dirname, '../docs.warp-drive.io/guides');
  const glob = globSync('**/*.md', { cwd: GuidesDirectoryPath });
  const groups: Record<string, GuideGroup> = {};

  for (const filepath of glob) {
    const slugPath = [];
    const text = readFileSync(path.join(GuidesDirectoryPath, filepath), 'utf-8');
    const frontMatter = fm<WarpDriveFrontMatter>(text);

    if (frontMatter.attributes.draft) {
      // skip hidden files
      continue;
    }

    if (filepath === 'index.md') {
      groups['the-manual'] = groups['the-manual'] || {
        text: frontMatter.attributes.categoryTitle!,
        path: filepath,
        slug: filepath,
        index: frontMatter.attributes.categoryOrder || 0,
        collapsed: frontMatter.attributes.collapsed || true,
        link: '/guides/index.md',
        items: {},
      };
      Object.assign(groups['the-manual'], {
        text: frontMatter.attributes.categoryTitle!,
        index: frontMatter.attributes.categoryOrder || 0,
        collapsed: frontMatter.attributes.collapsed || true,
        link: '/guides/index.md',
      });
      groups['the-manual'].items[filepath] = {
        text: frontMatter.attributes.title!,
        path: filepath,
        slug: filepath,
        index: frontMatter.attributes.order ?? 0,
        collapsed: false,
        items: {},
        link: '/guides/index.md',
      };
      continue;
    }

    const segments = filepath.split(path.sep);
    let lastSegment = segments.pop()!;
    let isIndex = false;

    if (lastSegment === 'index.md') {
      // we treat index files as the main entry to any guides directory
      lastSegment = segments.pop()!;

      if (!lastSegment) {
        throw new Error(`Top Level Index.md is not allowed: ${filepath}`);
      }

      isIndex = true;
    }

    let group = groups;
    let parent = null;

    // build out nodes for each segment
    // if there is not one yet.
    for (let i = 0; i < segments.length; i++) {
      const prevSegment = i > 0 ? segments[i - 1] : null;
      const segment = segments[i];
      slugPath.push(segment);
      const key = slugPath.join('.');
      const collapsed = AlwaysOpenGroups.includes(key) ? null : DefaultOpenGroups.includes(key) ? false : true;

      // setup a nested segment if we don't already have one
      if (!group[segment]) {
        group[segment] = {
          text: segmentToTitle(segment, prevSegment),
          index: null,
          path: segment,
          slug: segment,
          collapsed,
          items: {},
        };
      }

      parent = group[segment];
      group = group[segment].items!;
    }

    slugPath.push(lastSegment);
    const key = slugPath.join('.');
    const realUrl = `/guides/${filepath}`;

    // setup our leaf-most segment for this file
    // if needed, it may exist from a child directory already
    if (!group[lastSegment]) {
      group[lastSegment] = {
        text: segmentToTitle(lastSegment, parent ? parent.path : null),
        index: null,
        path: lastSegment,
        slug: lastSegment,
        collapsed: AlwaysOpenGroups.includes(key) ? null : DefaultOpenGroups.includes(key) ? false : true,
        items: {},
        // if we are an index file, this has the effect of setting the link on the parent node
        // this seems to work even though there's an issue
        // that says it doesn't: https://github.com/vuejs/vitepress/issues/2989
        // however:
        // when doing this, the "next page" feature breaks for
        // these pages, so for now we just do non-clickable headers.
        link: realUrl,
      };
    } else {
      // the segment was previously generated from a file in a child directory on the same path.
      // we need to add in the link.
      group[lastSegment].link = realUrl;
    }

    // update the leaf-most segment with any frontmatter info
    const leaf = group[lastSegment]!;

    // if the leaf is the index, we need to update the category entry
    // and then generate an item entry for it.
    if (isIndex) {
      if ('collapsed' in frontMatter.attributes) {
        leaf.collapsed = frontMatter.attributes.collapsed!;
      }
      if ('categoryOrder' in frontMatter.attributes) {
        leaf.index = frontMatter.attributes.categoryOrder!;
      }
      if ('categoryTitle' in frontMatter.attributes) {
        leaf.text = frontMatter.attributes.categoryTitle!;
      }

      // generate the entry for the file itself unless we are a top-level index file
      leaf.items['index.md'] = {
        path: 'index.md',
        slug: 'index.md',
        collapsed: false,
        text: frontMatter.attributes.title ?? 'Overview',
        index: frontMatter.attributes.order ?? 0,
        link: group[lastSegment]!.link,
        items: {},
      };
    } else {
      // update the leaf's title and order
      if (frontMatter.attributes.title) {
        leaf.text = frontMatter.attributes.title;
      }
      if ('order' in frontMatter.attributes) {
        leaf.index = frontMatter.attributes.order!;
      }
    }
  }

  // deep iterate converting items objects to arrays
  const result = deepConvert(groups);
  // console.log(JSON.stringify(result, null, 2));
  // console.log(JSON.stringify(rewritten, null, 2));
  const structure = { paths: result };

  writeFileSync(
    path.join(__dirname, '../docs.warp-drive.io/guides/nav.json'),
    JSON.stringify(structure, null, 2),
    'utf-8'
  );
  await import(path.join(__dirname, '../docs.warp-drive.io/guides/nav.json'), {
    with: { type: 'json' },
  });

  return { paths: result };
}

function deepConvert(obj: Record<string, any>) {
  const groups = Array.from(Object.values(obj));
  const sortedGroups = new Array(groups.length).fill(null);

  for (const group of groups) {
    delete group.path;
    delete group.slug;
    if (group.index !== null) {
      if (sortedGroups[group.index] !== null) {
        throw new Error(`Duplicate index ${group.index} for ${group.path}`);
      }
      sortedGroups[group.index] = group;
    }
    if (group.items) {
      if (Object.keys(group.items).length === 0) {
        delete group.items;
        delete group.collapsed;
      } else {
        group.items = deepConvert(group.items);

        if (!group.link && !group.items[0].items) {
          group.link = group.items[0].link;
        }
      }
    }
  }

  for (const group of groups) {
    if (group.index === null) {
      // find the first null index and insert
      const firstNullIndex = sortedGroups.findIndex((g) => g === null);
      if (firstNullIndex !== -1) {
        sortedGroups[firstNullIndex] = group;
        group.index = firstNullIndex;
      }
    }
  }

  return sortedGroups;
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

const CORE_PACKAGES = [
  '@warp-drive/core',
  '@warp-drive/experiments',
  '@warp-drive/json-api',
  '@warp-drive/utilities',
  '@warp-drive/legacy',
];

function isFrameworkPackage(name: string) {
  return !OLD_PACKAGES.includes(name) && !CORE_PACKAGES.includes(name);
}

export function splitApiDocsSidebar(sidebar: SidebarItem[]) {
  const oldPackages: SidebarItem[] = [];
  const corePackages = { text: 'Universal', items: [] as SidebarItem[] } satisfies SidebarItem;
  const frameworkPackages = { text: 'Frameworks', items: [] as SidebarItem[] } satisfies SidebarItem;

  for (const item of sidebar) {
    if (OLD_PACKAGES.includes(item.text)) {
      oldPackages.push(item);
    } else {
      if (isFrameworkPackage(item.text)) {
        frameworkPackages.items.push(item);
      } else {
        corePackages.items.push(item);
      }
    }
  }

  return {
    oldPackages,
    frameworkPackages,
    corePackages,
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
  const MainPackages: string[] = [];
  const FrameworkPackages: string[] = [];
  const OldPackages: string[] = [];
  for (const item of sidebar.corePackages.items) {
    MainPackages.push(`- [${item.text}](${item.link!})`);
  }
  for (const item of sidebar.frameworkPackages.items) {
    FrameworkPackages.push(`- [${item.text}](${item.link!})`);
  }
  for (const item of sidebar.oldPackages) {
    OldPackages.push(`- [${item.text}](${item.link!})`);
  }

  // generate the API documentation
  const apiDocumentation = `${ApiDocumentation}\n\n## Main Packages\n\n${MainPackages.join('\n')}\n\n## Framework Packages\n\n${FrameworkPackages.join('\n')}\n\n## Legacy Packages\n\n${OldPackages.join('\n')}\n\n`;

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

    // if the file is in @warp-drive/legacy add the legacy badge
    if (file.includes('@warp-drive/legacy')) {
      newContent = `<Badge type="danger" text="@legacy" /><br><br>` + content;
    }

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
