import path from 'path';
// @ts-expect-error missing in node types
import { globSync } from 'node:fs';

function segmentToTitle(segment: string) {
  const value = segment.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  if (!isNaN(Number(value[0]))) {
    value.shift();
  }
  const result = value.join(' ').replace('.md', '');

  return result === 'Index' ? 'Introduction' : result;
}

export async function getGuidesStructure() {
  const GuidesDirectoryPath = path.join(__dirname, '../../guides');
  const glob = globSync('**/*.md', { cwd: GuidesDirectoryPath }) as string[];

  const groups: Record<string, any> = {};

  for (const filepath of glob) {
    const segments = filepath.split(path.sep);
    const lastSegment = segments.pop()!;
    let group = groups;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!group[segment]) {
        group[segment] = {
          text: segmentToTitle(segment),
          collapsed: true,
          items: {},
        };
      }
      group = group[segment].items;
    }

    group[lastSegment] = {
      text: segmentToTitle(lastSegment),
      link: `/guides/${filepath.replace(/\.md$/, '')}`,
    };
  }

  // deep iterate converting items objects to arrays
  const result = deepConvert(groups);
  if (process.env.CI) {
    console.log(JSON.stringify(result, null, 2));
  }
  return result;
}

function deepConvert(obj: Record<string, any>) {
  const groups = Array.from(Object.values(obj));

  for (const group of groups) {
    if (group.items) {
      group.items = deepConvert(group.items);
    }
  }
  return groups;
}
