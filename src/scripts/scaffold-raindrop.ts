/*
  Fetches every raindrop in the moodboard collection and writes them to
  src/content/moodboard/raindrop-collection.json.

  Run with: pnpm scaffold:raindrop
  Preview without writing: pnpm scaffold:raindrop:dry
  Requires RAINDROP_MULTIPLE_ENDPOINT, RAINDROP_MOODBOARD_ID and RAINDROP_TOKEN.
*/
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const PER_PAGE = 50;

/*
  Only the response envelope is typed. Items are persisted verbatim and no
  field is read here — `data-adapter.ts` is what interprets them — so typing
  them would duplicate that knowledge and drift from it.
*/
interface RaindropPage {
  items: unknown[];
  count: number;
}

async function fetchRaindropPage(
  endpoint: string,
  collectionId: string,
  token: string,
  page: number
): Promise<RaindropPage> {
  const response = await fetch(`${endpoint}/${collectionId}?perpage=${PER_PAGE}&page=${page}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Raindrop API returned ${response.status} ${response.statusText} for page ${page}`);
  }

  return (await response.json()) as RaindropPage;
}

async function fetchRaindropCollection(): Promise<unknown[]> {
  const endpoint = process.env.RAINDROP_MULTIPLE_ENDPOINT;
  const collectionId = process.env.RAINDROP_MOODBOARD_ID;
  const token = process.env.RAINDROP_TOKEN;

  if (!endpoint || !collectionId || !token) {
    throw new Error(
      'Missing environment variables: RAINDROP_MULTIPLE_ENDPOINT, RAINDROP_MOODBOARD_ID and RAINDROP_TOKEN are all required'
    );
  }

  /*
    The first response carries `count`, the collection total, so every
    remaining page can be requested at once rather than discovered one at a
    time. This is why there is no sequential loop here.
  */
  const firstPage = await fetchRaindropPage(endpoint, collectionId, token, 0);
  const remainingPageNumbers = [...Array(Math.max(0, Math.ceil(firstPage.count / PER_PAGE) - 1)).keys()].map(
    (index) => index + 1
  );

  const remainingPages = await Promise.all(
    remainingPageNumbers.map((page) => fetchRaindropPage(endpoint, collectionId, token, page))
  );

  const items = [firstPage.items, ...remainingPages.map((page) => page.items)].flat();

  if (items.length !== firstPage.count) {
    console.warn(`Expected ${firstPage.count} items from the API but assembled ${items.length}`);
  }

  return items;
}

function collectionPath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(currentDir, '../content/moodboard/raindrop-collection.json');
}

function idsOf(items: unknown[]): Set<unknown> {
  return new Set(items.map((item) => (item as { _id?: unknown })._id));
}

/*
  Reports what a real run would change, without touching the file. This exists
  because the script overwrites a checked-in collection, so running it to "see
  what happens" is otherwise destructive.
*/
function reportDryRun(items: unknown[]): void {
  const filePath = collectionPath();
  console.log(`[dry run] fetched ${items.length} items; nothing written`);

  if (!fs.existsSync(filePath)) {
    console.log(`[dry run] ${filePath} does not exist yet; a real run would create it`);
    return;
  }

  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown[];
  const existingIds = idsOf(existing);
  const fetchedIds = idsOf(items);
  const added = [...fetchedIds].filter((id) => !existingIds.has(id)).length;
  const removed = [...existingIds].filter((id) => !fetchedIds.has(id)).length;

  console.log(`[dry run] on disk: ${existing.length} items`);
  console.log(`[dry run] a real run would add ${added} and remove ${removed}`);
}

function saveRaindropCollection(items: unknown[]): void {
  const filePath = collectionPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`Wrote ${items.length} items to ${filePath}`);
}

const isDryRun = process.argv.includes('--dry-run');
const collection = await fetchRaindropCollection();

/*
  Refuse to persist an empty collection. An earlier version swallowed fetch
  errors and returned [], which then overwrote the checked-in collection with
  an empty array.
*/
if (collection.length === 0) {
  throw new Error('Raindrop returned no items; refusing to overwrite the existing collection');
}

if (isDryRun) {
  reportDryRun(collection);
} else {
  saveRaindropCollection(collection);
}
