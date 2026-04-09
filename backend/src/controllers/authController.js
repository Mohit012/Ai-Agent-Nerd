import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { sendPasswordResetEmail, sendVerificationEmail, sendOTPEmail } from '../services/emailService.js';
import { generateOTP, verifyOTP, clearOTP } from '../services/otpService.js';

const getDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  let browser = 'Unknown browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return { browser, os, device: `${os} - ${browser}`, ip: req.ip || req.connection?.remoteAddress || 'Unknown IP' };
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
};

const validatePasswordStrength = (password) => {
  const errors = [];
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  return errors;
};

export const registerInit = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: passwordErrors[0], errors: passwordErrors });
    }

    let otp;
    try {
      otp = generateOTP(email);
    } catch (error) {
      return res.status(429).json({ message: error.message });
    }

    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent && process.env.NODE_ENV === 'production') {
      return res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }

    const tempToken = jwt.sign(
      { email, password, name, temp: true },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      message: 'Verification code sent to your email',
      tempToken,
      email: email.substring(0, 3) + '***' + email.substring(email.indexOf('@'))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const registerVerify = async (req, res) => {
  try {
    const { tempToken, otp } = req.body;

    if (!tempToken || !otp) {
      return res.status(400).json({ message: 'Token and OTP are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Session expired. Please register again.' });
    }

    if (!decoded.temp) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const { email, password, name } = decoded;

    const result = verifyOTP(email, otp);
    if (!result.valid) {
      return res.status(400).json({ message: result.error });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = await User.create({ 
      email, 
      password, 
      name,
      verificationToken,
      isEmailVerified: true
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    clearOTP(email);

    let otp;
    try {
      otp = generateOTP(email);
    } catch (error) {
      return res.status(429).json({ message: error.message });
    }

    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent && process.env.NODE_ENV === 'production') {
      return res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
    }

    res.json({
      message: 'Verification code resent',
      email: email.substring(0, 3) + '***' + email.substring(email.indexOf('@'))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);
      const refreshToken = rememberMe ? generateRefreshToken(user._id) : null;
      
      user.lastLogin = new Date();
      if (refreshToken) {
        user.refreshToken = refreshToken;
        user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
      await user.save();

      const deviceInfo = getDeviceInfo(req);
      const session = await Session.create({
        userId: user._id,
        token,
        ...deviceInfo,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isCurrent: true
      });

      await Session.updateMany(
        { userId: user._id, _id: { $ne: session._id } },
        { isCurrent: false }
      );

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        token,
        refreshToken: refreshToken || undefined,
        sessionId: session._id
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken -verificationToken -resetPasswordToken');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (user.refreshTokenExpire < new Date()) {
      user.refreshToken = null;
      user.refreshTokenExpire = null;
      await user.save();
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({
      token: generateToken(user._id),
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);
    
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    if (name) user.name = name;
    if (email) user.email = email;
    
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: passwordErrors[0], errors: passwordErrors });
    }
    
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
      await user.save();

      const emailSent = await sendPasswordResetEmail(email, resetToken);

      if (!emailSent && process.env.NODE_ENV === 'production') {
        console.error('Failed to send password reset email to:', email);
      }
    }

    res.json({ 
      message: 'If an account with that email exists, we have sent a password reset link.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: passwordErrors[0], errors: passwordErrors });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshToken = null;
    user.refreshTokenExpire = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent && process.env.NODE_ENV === 'production') {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.json({ 
      message: 'Verification email sent',
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    await Session.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ 
      userId: req.user._id,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActive: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, userId: req.user._id });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await Session.findByIdAndDelete(sessionId);
    res.json({ message: 'Session logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutAllSessions = async (req, res) => {
  try {
    const currentToken = req.headers.authorization?.split(' ')[1];
    await Session.deleteMany({ 
      userId: req.user._id,
      token: { $ne: currentToken }
    });
    res.json({ message: 'All other sessions logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const googleAuth = (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = generateRefreshToken(req.user._id);
  
  req.user.lastLogin = new Date();
  req.user.refreshToken = refreshToken;
  req.user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  req.user.save();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/auth/callback?token=${token}&refreshToken=${refreshToken}&user=${JSON.stringify({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    avatar: req.user.avatar,
    isEmailVerified: req.user.isEmailVerified
  })}`);
};

export const googleAuthCallback = (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = generateRefreshToken(req.user._id);
  
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    avatar: req.user.avatar,
    isEmailVerified: req.user.isEmailVerified,
    token,
    refreshToken
  });
};
