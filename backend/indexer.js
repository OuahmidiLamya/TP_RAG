import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { qdrant, hf, COLLECTION_NAME, VECTOR_SIZE, HF_EMBEDDING_MODEL, HF_EMBEDDING_ENDPOINT, USE_HF_EMBEDDINGS } from './config/database.js';
import { getLocalEmbedding } from './services/embeddings.js';

dotenv.config();

const CORPUS_DIR = './corpus';

async function ensureCollection() {
  try {
    const collection = await qdrant.getCollection(COLLECTION_NAME);
    console.log(`Collection "${COLLECTION_NAME}" exists with ${collection.points_count} points`);

    const currentSize = collection?.config?.params?.vectors?.size;
    if (currentSize !== VECTOR_SIZE) {
      console.log(`Vector size mismatch (${currentSize} != ${VECTOR_SIZE}). Recreating collection...`);
      await qdrant.deleteCollection(COLLECTION_NAME);
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine'
        }
      });
      console.log(`Collection "${COLLECTION_NAME}" recreated`);
      return;
    }

    if (collection.points_count > 0) {
      console.log(`Deleting ${collection.points_count} existing points...`);

      await qdrant.delete(COLLECTION_NAME, {
        wait: true,
        filter: {}
      });

      console.log('Collection cleared');
    }
  } catch (err) {
    console.log(`Creating collection "${COLLECTION_NAME}"...`);
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      }
    });
    console.log(`Collection "${COLLECTION_NAME}" created`);
  }
}

async function getEmbedding(text) {
  if (!USE_HF_EMBEDDINGS) {
    return getLocalEmbedding(text);
  }

  const res = await hf.featureExtraction({
    model: HF_EMBEDDING_MODEL,
    endpointUrl: `${HF_EMBEDDING_ENDPOINT}/${HF_EMBEDDING_MODEL}`,
    inputs: `passage: ${text}`
  });

  // HF can return nested arrays; normalize to 1D vector
  if (Array.isArray(res) && Array.isArray(res[0])) {
    const rows = res;
    const dims = rows[0].length;
    const mean = new Array(dims).fill(0);
    for (const row of rows) {
      for (let i = 0; i < dims; i += 1) {
        mean[i] += row[i];
      }
    }
    for (let i = 0; i < dims; i += 1) {
      mean[i] /= rows.length;
    }
    return mean;
  }

  return res;
}

async function indexCorpus() {
  await ensureCollection();

  console.log('Reading corpus...');
  const files = fs.readdirSync(CORPUS_DIR).filter((file) => file.endsWith('.json'));

  if (files.length === 0) {
    console.log('No .json files found in corpus/');
    return;
  }

  for (const file of files) {
    const filePath = path.join(CORPUS_DIR, file);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const doc = JSON.parse(rawData);

    if (!doc.text || typeof doc.text !== 'string') {
      console.warn(`Skipping ${file} - missing or invalid "text" field.`);
      continue;
    }

    try {
      console.log(`Indexing ${file}...`);

      const vector = await getEmbedding(doc.text);
      const id = randomUUID();

      const point = {
        id,
        vector,
        payload: {
          text: doc.text,
          title: doc.title || 'Unknown',
          author: doc.author || 'Anonymous',
          date: doc.date || 'Unknown',
          category: doc.category || 'Misc',
          tags: doc.tags || [],
          source: file
        }
      };

      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points: [point]
      });

      console.log(`File ${file} indexed successfully`);
    } catch (err) {
      const msg = err?.response?.data || err.message || err;
      console.error(`Error indexing ${file}:`, msg);
    }
  }

  console.log('Indexing complete.');
}

indexCorpus().then(() => console.log('Indexing finished successfully.')).catch(console.error);
