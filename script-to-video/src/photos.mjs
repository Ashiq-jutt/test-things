import fs from 'node:fs';
import path from 'node:path';

const SEARCH_URL = 'https://api.openverse.org/v1/images/';
const USER_AGENT = 'script-to-video/1.0 (personal video tool)';
// Licences that allow commercial use. CC0 and public domain need no credit; CC BY needs one.
const FREE_LICENSES = 'cc0,pdm';
const CREDIT_LICENSES = 'cc0,pdm,by';
const MIN_RESULTS = 8;
const MIN_BYTES = 30_000;

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "[photo: lion roaring #2]" picks the second search result instead of the first.
export function parsePhotoTag(value) {
  const match = value.match(/^(.*?)\s*#(\d+)$/);
  return match
    ? { query: match[1].trim(), pick: Math.max(1, Number(match[2])) }
    : { query: value.trim(), pick: 1 };
}

async function search(query, licenses, aspect) {
  const params = new URLSearchParams({ q: query, license: licenses, page_size: '20', mature: 'false' });
  if (aspect) params.set('aspect_ratio', aspect);

  const response = await fetch(`${SEARCH_URL}?${params}`, { headers: { 'User-Agent': USER_AGENT } });
  if (response.status === 429) throw new Error('Photo search limit reached, try again in a few minutes');
  if (!response.ok) throw new Error(`Photo search failed (${response.status})`);

  const { results } = await response.json();
  return results.filter((photo) => /\.(jpe?g|png)($|\?)/i.test(photo.url) || photo.filetype);
}

export async function searchPhotos(query, format = 'horizontal') {
  const aspect = format === 'vertical' ? 'tall' : format === 'square' ? 'square' : 'wide';
  let results = await search(query, FREE_LICENSES, aspect);
  if (results.length < MIN_RESULTS) {
    const more = await search(query, CREDIT_LICENSES, aspect);
    const seen = new Set(results.map((photo) => photo.id));
    results = results.concat(more.filter((photo) => !seen.has(photo.id)));
  }
  return results;
}

async function download(url, file) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < MIN_BYTES) throw new Error('Image is too small');
  fs.writeFileSync(file, bytes);
}

function readCredits(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

// Finds a photo for the search words, saves it in `photoDir` and returns its path.
// A photo that is already saved is reused, so you can swap the file for your own.
export async function findPhoto(tag, { photoDir, format }) {
  const { query, pick } = parsePhotoTag(tag);
  const name = `${slug(query)}${pick > 1 ? `-${pick}` : ''}`;
  const saved = ['.jpg', '.jpeg', '.png'].map((ext) => path.join(photoDir, name + ext)).find(fs.existsSync);
  if (saved) return saved;

  fs.mkdirSync(photoDir, { recursive: true });
  const results = await searchPhotos(query, format);
  if (results.length === 0) throw new Error(`No free photo found for "${query}"`);

  // Start at the requested result and move on if a download fails.
  const candidates = results.slice(Math.min(pick, results.length) - 1);
  for (const photo of candidates) {
    const ext = /\.png($|\?)/i.test(photo.url) ? '.png' : '.jpg';
    const file = path.join(photoDir, name + ext);
    try {
      await download(photo.url, file);
    } catch {
      continue;
    }

    const creditsFile = path.join(photoDir, 'credits.json');
    const credits = readCredits(creditsFile);
    credits[path.basename(file)] = {
      title: photo.title,
      creator: photo.creator,
      license: `${photo.license} ${photo.license_version ?? ''}`.trim().toUpperCase(),
      creditRequired: photo.license === 'by',
      page: photo.foreign_landing_url,
    };
    fs.writeFileSync(creditsFile, JSON.stringify(credits, null, 2));
    return file;
  }
  throw new Error(`Could not download a photo for "${query}"`);
}

// Credit lines for the photos whose licence requires one, for the video description.
export function creditLines(files, photoDir) {
  const credits = readCredits(path.join(photoDir, 'credits.json'));
  const lines = new Set();
  for (const file of files) {
    const credit = credits[path.basename(file)];
    if (credit?.creditRequired) {
      lines.add(`"${credit.title}" by ${credit.creator ?? 'unknown'}, ${credit.license}, ${credit.page}`);
    }
  }
  return [...lines];
}
