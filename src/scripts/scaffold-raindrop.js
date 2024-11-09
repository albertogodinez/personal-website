/*
  This script fetches all raindrops from a moodboard collection and saves them to a JSON file.
  The script is run with the following command:
  node src/scripts/scaffold-raindrop.js
*/
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

async function fetchRaindropByPage(multipleRaindropsEndpoint, moodboardRaindropId, token, page) {
  const response = await fetch(`${multipleRaindropsEndpoint}/${moodboardRaindropId}?perpage=50&page=${page}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data;
}

async function fetchRaindropCollection() {
  const multipleRaindropsEndpoint = process.env.RAINDROP_MULTIPLE_ENDPOINT;
  const moodboardRaindropId = process.env.RAINDROP_MOODBOARD_ID;
  const token = process.env.RAINDROP_TOKEN;

  if (!multipleRaindropsEndpoint || !moodboardRaindropId || !token) {
    throw new Error('Missing environment variables');
  }

  let bookmarkedItems = [];
  let page = 0;
  let itemsLeft = undefined;

  try {
    do {
      const { items, count } = await fetchRaindropByPage(multipleRaindropsEndpoint, moodboardRaindropId, token, page);

      itemsLeft = itemsLeft === undefined ? count - items.length : itemsLeft - items.length;
      bookmarkedItems = [...bookmarkedItems, ...items];
      page++;
    } while (itemsLeft > 0);
  } catch (e) {
    console.error(`Error fetching raindrop collection: ${e}`);
  }

  return bookmarkedItems;
}

async function saveRaindropCollection(bookmarkedItems) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../content/moodboard/raindrop-collection.json');

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(bookmarkedItems, null, 2));
  } catch (e) {
    console.error(`Error writing raindrop collection to file: ${e}`);
  }
}

(async () => {
  const bookmarkedItems = await fetchRaindropCollection();
  await saveRaindropCollection(bookmarkedItems);
})();
