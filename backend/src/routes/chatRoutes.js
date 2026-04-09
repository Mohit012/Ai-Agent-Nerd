import express from 'express';
import { sendMessage, summarizeDocument, explainConcept, grammarCheck, generateNotes, translateDocument, generateQuiz, generateFlashcards } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/message', protect, express.json({ limit: '10mb' }), sendMessage);
router.post('/summarize', protect, summarizeDocument);
router.post('/explain', protect, explainConcept);
router.post('/grammar', protect, grammarCheck);
router.post('/notes', protect, generateNotes);
router.post('/translate', protect, express.json({ limit: '10mb' }), translateDocument);
router.post('/quiz', protect, generateQuiz);
router.post('/flashcards', protect, generateFlashcards);

export default router;
