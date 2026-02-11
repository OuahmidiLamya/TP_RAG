import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';
import { HfInference } from '@huggingface/inference';

dotenv.config();

// Qdrant configuration
export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://vectordb:6333'
});

// Hugging Face configuration
export const hf = new HfInference(process.env.HF_API_KEY);

// Models
export const HF_EMBEDDING_MODEL = process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
export const HF_CHAT_MODEL = process.env.HF_CHAT_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
export const HF_EMBEDDING_ENDPOINT = process.env.HF_EMBEDDING_ENDPOINT || 'https://router.huggingface.co/hf-inference/models';
export const HF_CHAT_ENDPOINT = process.env.HF_CHAT_ENDPOINT || 'https://router.huggingface.co/hf-inference/models';
export const USE_HF_EMBEDDINGS = process.env.USE_HF_EMBEDDINGS === 'true';
export const USE_HF_CHAT = process.env.USE_HF_CHAT === 'true';

// Constants
export const COLLECTION_NAME = 'corpus';
export const VECTOR_SIZE = 256; // Local hash embedding size
