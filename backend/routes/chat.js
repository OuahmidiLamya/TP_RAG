import express from 'express';
import { ragService } from '../services/rag.js';

const router = express.Router();

/**
 * POST /ask - process user questions
 */
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.length > 1000) {
      return res.status(400).json({
        error: 'Question invalide ou trop longue'
      });
    }

    const result = await ragService.processQuestion(question);
    return res.json(result);
  } catch (error) {
    console.error('Error in /ask:', error.message || error);
    return res.status(500).json({
      error: "Erreur serveur: probleme avec l'API OpenAI"
    });
  }
});

export default router;
