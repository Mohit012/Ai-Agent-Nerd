import express from 'express';
import multer from 'multer';
import path from 'path';
import passport from 'passport';
import '../config/passport.js';
import { 
  registerInit, 
  registerVerify,
  login, 
  getMe, 
  updateProfile, 
  changePassword, 
  refreshTokenHandler,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  resendOTP,
  deleteAccount,
  getSessions,
  logoutSession,
  logoutAllSessions,
  googleAuth,
  googleAuthCallback
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: './uploads/avatars/',
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user._id}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

router.post('/avatar', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const User = (await import('../models/User.js')).default;
    await User.findByIdAndUpdate(req.user._id, { avatar: `/avatars/${req.file.filename}` });
    res.json({ avatarUrl: `/avatars/${req.file.filename}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register/init', registerInit);
router.post('/register/verify', registerVerify);
router.post('/register/resend-otp', resendOTP);
router.post('/login', login);
router.post('/refresh-token', refreshTokenHandler);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.delete('/account', protect, deleteAccount);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:sessionId', protect, logoutSession);
router.post('/sessions/logout-all', protect, logoutAllSessions);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), googleAuth);

export default router;
