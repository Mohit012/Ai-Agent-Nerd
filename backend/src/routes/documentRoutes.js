import express from 'express';
import { uploadMiddleware, uploadDocument, getDocuments, getDocument, deleteDocument, updateAnnotations, getVersions, restoreVersion, renameDocument, searchDocuments, shareDocument, unshareDocument, getSharedDocument, importFromUrl } from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/upload', protect, uploadMiddleware, uploadDocument);
router.post('/import-url', protect, importFromUrl);
router.get('/', protect, getDocuments);
router.get('/search', protect, searchDocuments);
router.get('/shared/:token', getSharedDocument);
router.get('/:id', protect, getDocument);
router.delete('/:id', protect, deleteDocument);
router.put('/:id/annotations', protect, updateAnnotations);
router.get('/:id/versions', protect, getVersions);
router.post('/:id/versions/:versionId/restore', protect, restoreVersion);
router.put('/:id/rename', protect, renameDocument);
router.post('/:id/share', protect, shareDocument);
router.delete('/:id/share', protect, unshareDocument);

export default router;
