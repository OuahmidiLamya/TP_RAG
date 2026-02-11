import { qdrant, COLLECTION_NAME } from '../config/database.js';

/**
 * Service for vector operations with Qdrant
 */
export class VectorService {
  /**
   * Check Qdrant connection
   */
  async checkConnection() {
    try {
      await qdrant.getCollections();
      console.log('Qdrant connected');
      return true;
    } catch (err) {
      console.error('Qdrant error:', err.message || err);
      return false;
    }
  }

  /**
   * Semantic search in the collection
   * @param {number[]} vector - Search vector
   * @param {number} limit - Result limit
   * @param {number} scoreThreshold - Relevance threshold
   * @returns {Promise<Array>} Search results
   */
  async search(vector, limit = 3, scoreThreshold = 0.0) {
    try {
      const results = await qdrant.search(COLLECTION_NAME, {
        vector,
        limit,
        with_payload: true,
        score_threshold: scoreThreshold
      });
      return results;
    } catch (err) {
      console.error('Vector search error:', err.message || err);
      throw err;
    }
  }

  /**
   * Adaptive threshold based on question length
   * @param {string} question - Question to analyze
   * @returns {number} Threshold
   */
  getAdaptiveThreshold(question) {
    const wordCount = question.split(' ').length;
    if (wordCount <= 3) return 0.0;
    if (wordCount <= 6) return 0.0;
    return 0.0;
  }
}

export const vectorService = new VectorService();
