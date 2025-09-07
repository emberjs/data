// @ts-expect-error for now
import fs from 'node:fs';

async function getFromCache(key: string): Promise<any | null> {
  const CacheDir = './docs.warp-drive.io/.vitepress/cache/github-api';
  const filePath = `${CacheDir}/${key}.json`;
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading cache file ${filePath}:`, error.message);
  }

  return null;
}

async function saveToCache(key: string, data: any): Promise<void> {
  const CacheDir = './docs.warp-drive.io/.vitepress/cache/github-api';
  const filePath = `${CacheDir}/${key}.json`;
  try {
    fs.mkdirSync(CacheDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  } catch (error) {
    console.error(`Error writing cache file ${filePath}:`, error.message);
  }
}

// see https://vitepress.dev/reference/default-theme-team-page
async function load() {
  const all: any[] = [];
  let contributors;
  let pages = 0;
  const PAGE_SIZE = 100;
  const MAX_PAGES = 10; // safety to prevent infinite loops

  do {
    // check the http cache first
    const cached = await getFromCache(`warp-drive-contributors-page-${pages}`);
    if (cached) {
      contributors = cached;
    } else {
      const res = await fetch(
        `https://api.github.com/repos/warp-drive-data/warp-drive/contributors?per_page=${PAGE_SIZE}`
      );
      contributors = await res.json();
      // store the result in cache if successful
      if (res.ok && Array.isArray(contributors)) {
        await saveToCache(`warp-drive-contributors-page-${pages}`, contributors);
      }
    }
    if (Array.isArray(contributors)) {
      all.push(...contributors);
    }
    pages++;
  } while (Array.isArray(contributors) && contributors.length === PAGE_SIZE && pages < MAX_PAGES);

  // Map the GitHub API data to the format expected by <VPTeamMembers>
  return all
    .filter((contributor) => {
      const name = contributor.login.toLowerCase();
      return !name.includes('dependabot') && !name.includes('renovate') && !name.includes('ember-tomster');
    })
    .map((contributor) => ({
      name: contributor.login,
      avatar: contributor.avatar_url,
      links: [{ icon: 'github', link: contributor.html_url }],
    }));
}

export default {
  load,
};
