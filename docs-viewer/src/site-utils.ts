import path from 'path';
import { globSync } from 'node:fs';

function segmentToTitle(segment: string) {
  const value = segment.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  if (!isNaN(Number(value[0]))) {
    value.shift();
  }
  const result = value.join(' ').replace('.md', '');

  return result === 'Index' ? 'Introduction' : result;
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

export async function getGuidesStructure() {
  const GuidesDirectoryPath = path.join(__dirname, '../../guides');
  const glob = globSync('**/*.md', { cwd: GuidesDirectoryPath });
  const groups: Record<string, any> = {
    manual: {
      text: 'The Manual',
      index: 0,
      items: {},
    },
  };

  for (const filepath of glob) {
    const segments = filepath.split(path.sep);
    const lastSegment = segments.pop()!;

    if (lastSegment.startsWith('0-')) {
      // skip hidden files
      continue;
    }

    let group = groups;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!group[segment]) {
        const existing = Object.keys(group);
        group[segment] = {
          text: segmentToTitle(segment),
          index: segmentToIndex(segment, existing.length),
          collapsed: true,
          items: {},
        };
      }
      group = group[segment].items;
    }

    if (group === groups) {
      group = groups.manual.items;
    }

    // add the last segment to the group
    const existing = Object.keys(group);
    group[lastSegment] = {
      text: segmentToTitle(lastSegment),
      index: segmentToIndex(lastSegment, existing.length),
      link: `/guide/${filepath.replace(/\.md$/, '')}`,
    };
  }

  // deep iterate converting items objects to arrays
  const result = deepConvert(groups);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function deepConvert(obj: Record<string, any>) {
  const groups = Array.from(Object.values(obj));

  for (const group of groups) {
    if (group.items) {
      group.items = deepConvert(group.items);
    }
  }
  return groups.sort((a, b) => {
    return a.index < b.index ? -1 : a.index > b.index ? 1 : 0;
  });
}
