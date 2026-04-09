import express from 'express';
import { getConversations, getConversation, deleteConversation, updateConversationFolder, renameConversation, shareConversation, unshareConversation, getSharedConversation } from '../controllers/conversationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getConversations);
router.get('/shared/:token', getSharedConversation);
router.get('/:id', protect, getConversation);
router.delete('/:id', protect, deleteConversation);
router.put('/:id/folder', protect, updateConversationFolder);
router.put('/:id/rename', protect, renameConversation);
router.post('/:id/share', protect, shareConversation);
router.delete('/:id/share', protect, unshareConversation);

export default router;
