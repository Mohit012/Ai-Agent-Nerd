import crypto from 'crypto';

const otpStore = new Map();

const OTP_EXPIRY = 10 * 60 * 1000;

export const generateOTP = (email) => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  
  const existing = otpStore.get(email);
  if (existing) {
    const timeSinceLastOtp = Date.now() - existing.createdAt;
    if (timeSinceLastOtp < 60000) {
      const remainingSeconds = Math.ceil((60000 - timeSinceLastOtp) / 1000);
      throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP`);
    }
  }
  
  otpStore.set(email, {
    otp: hashedOtp,
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_EXPIRY
  });
  
  return otp;
};

export const verifyOTP = (email, otp) => {
  const record = otpStore.get(email);
  
  if (!record) {
    return { valid: false, error: 'No OTP found. Please request a new one.' };
  }
  
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { valid: false, error: 'OTP has expired. Please request a new one.' };
  }
  
  if (record.attempts >= 5) {
    otpStore.delete(email);
    return { valid: false, error: 'Too many attempts. Please request a new OTP.' };
  }
  
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  
  if (hashedOtp !== record.otp) {
    record.attempts += 1;
    const remainingAttempts = 5 - record.attempts;
    return { 
      valid: false, 
      error: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      remainingAttempts 
    };
  }
  
  otpStore.delete(email);
  return { valid: true };
};

export const clearOTP = (email) => {
  otpStore.delete(email);
};

setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(email);
    }
  }
}, 60000);
