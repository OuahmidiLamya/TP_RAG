import { hf, HF_CHAT_MODEL, HF_EMBEDDING_MODEL, HF_EMBEDDING_ENDPOINT, HF_CHAT_ENDPOINT, USE_HF_EMBEDDINGS, USE_HF_CHAT } from '../config/database.js';
import { getLocalEmbedding } from './embeddings.js';
import { vectorService } from './vector.js';

/**
 * Main RAG service - handles the full question-answer cycle
 */
export class RAGService {
  /**
   * Process a user question with RAG
   * @param {string} question - User question
   * @returns {Promise<Object>} Response with answer, sources and found
   */
  async processQuestion(question) {
    if (this.isGreeting(question)) {
      return {
        answer: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
        sources: [],
        found: true
      };
    }

    try {
      // 1. Generate embedding
      const vector = await this.generateEmbedding(question);

      // 2. Vector search with adaptive threshold
      const threshold = vectorService.getAdaptiveThreshold(question);
      const searchResults = await vectorService.search(vector, 3, threshold);

      if (searchResults.length === 0) {
        return {
          answer: "Desole, je n'ai pas d'informations sur ce sujet dans ma base de connaissances.",
          sources: [],
          found: false
        };
      }

      // 3. Build context
      const context = this.buildContext(searchResults);

      // 4. Generate answer
      const answer = await this.generateAnswer(question, context);

      // 5. Format sources
      const sources = this.formatSources(searchResults);

      return {
        answer,
        sources,
        found: true
      };
    } catch (error) {
      console.error('Error in processQuestion:', error.message || error);
      throw error;
    }
  }

  /**
   * Generate an embedding for the question
   * @param {string} question - Question to vectorize
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(question) {
    if (!USE_HF_EMBEDDINGS) {
      return getLocalEmbedding(question);
    }

    const res = await hf.featureExtraction({
      model: HF_EMBEDDING_MODEL,
      endpointUrl: `${HF_EMBEDDING_ENDPOINT}/${HF_EMBEDDING_MODEL}`,
      inputs: `query: ${question}`
    });

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

  /**
   * Generate an answer with HF text generation
   * @param {string} question - User question
   * @param {string} context - Retrieved context
   * @returns {Promise<string>} Generated answer
   */
  async generateAnswer(question, context) {
    const prompt = `Tu es un assistant IA specialise dans la recherche documentaire.

Contexte disponible :
${context}

Question : "${question}"

Instructions :
- Reponds uniquement en te basant sur le contexte fourni
- Si le contexte ne contient pas d'informations pertinentes, dis-le clairement
- Sois precis et factuel
- N'invente pas d'informations

Reponse :`;

    if (USE_HF_CHAT) {
      const result = await hf.textGeneration({
        model: HF_CHAT_MODEL,
        endpointUrl: `${HF_CHAT_ENDPOINT}/${HF_CHAT_MODEL}`,
        inputs: prompt,
        parameters: {
          max_new_tokens: 256,
          temperature: 0.3,
          return_full_text: false
        }
      });
      return (result?.generated_text || '').trim();
    }

    return this.fallbackAnswer(question, context);
  }

  /**
   * Check if the question is a greeting
   * @param {string} question - Question to check
   * @returns {boolean} True if greeting
   */
  isGreeting(question) {
    const greetings = ['salut', 'bonjour', 'hello', 'coucou'];
    return greetings.includes(question.toLowerCase().trim());
  }

  /**
   * Build context from search results
   * @param {Array} searchResults - Search results
   * @returns {string} Formatted context
   */
  buildContext(searchResults) {
    return searchResults.map((hit) => hit.payload.text).join('\n---\n');
  }

  /**
   * Fallback answer when HF chat is disabled/unavailable
   * @param {string} question
   * @param {string} context
   * @returns {string}
   */
  fallbackAnswer(question, context) {
    const lines = context.split(/\n+/).filter(Boolean);
    if (lines.length === 0) {
      return "Desole, je n'ai pas d'informations sur ce sujet dans ma base de connaissances.";
    }
    return `Selon les documents, voici l'information la plus pertinente : ${lines[0]}`;
  }

  /**
   * Format sources for display
   * @param {Array} searchResults - Search results
   * @returns {Array} Deduplicated sources
   */
  formatSources(searchResults) {
    const uniqueSources = new Map();

    searchResults.forEach((hit) => {
      const key = `${hit.payload.title}-${hit.payload.author}`;
      if (!uniqueSources.has(key)) {
        uniqueSources.set(key, {
          title: hit.payload.title,
          author: hit.payload.author,
          date: hit.payload.date,
          score: Math.round(hit.score * 100)
        });
      }
    });

    return Array.from(uniqueSources.values()).filter((src) => src.title && src.author && src.date);
  }
}

export const ragService = new RAGService();
