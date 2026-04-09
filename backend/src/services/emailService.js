import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const transporter = createTransporter();

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"NERD Study" <noreply@nerdstudy.com>',
    to: email,
    subject: 'Your Verification Code - NERD Study',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #10b981; padding: 20px; background: white; border-radius: 12px; margin: 20px 0; border: 2px dashed #10b981; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Email Verification</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for registering with NERD Study! Please use the verification code below to complete your registration:</p>
            <div class="otp-code">${otp}</div>
            <div class="warning">
              <strong>Important:</strong> This code expires in 10 minutes. Do not share this code with anyone.
            </div>
            <p>If you didn't create an account with NERD Study, please ignore this email.</p>
            <div class="footer">
              <p>This is an automated message from NERD Study. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Email Verification - NERD Study
      
      Hello,
      
      Thank you for registering with NERD Study! Please use the verification code below to complete your registration:
      
      ${otp}
      
      This code expires in 10 minutes.
      
      Do not share this code with anyone.
      
      If you didn't create an account with NERD Study, please ignore this email.
      
      This is an automated message from NERD Study.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"NERD Study" <noreply@nerdstudy.com>',
    to: email,
    subject: 'Password Reset Request - NERD Study',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your NERD Study account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #10b981;">${resetUrl}</p>
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 15 minutes. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </div>
            <p>For your security:</p>
            <ul>
              <li>This link can only be used once</li>
              <li>It will expire after 15 minutes</li>
              <li>You will be asked to create a new password</li>
            </ul>
            <div class="footer">
              <p>This is an automated message from NERD Study. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request - NERD Study
      
      Hello,
      
      We received a request to reset your password for your NERD Study account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 15 minutes.
      
      If you didn't request a password reset, please ignore this email.
      
      For your security:
      - This link can only be used once
      - It will expire after 15 minutes
      - You will be asked to create a new password
      
      This is an automated message from NERD Study.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

export const sendVerificationEmail = async (email, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"NERD Study" <noreply@nerdstudy.com>',
    to: email,
    subject: 'Verify Your Email - NERD Study',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for signing up for NERD Study! Please verify your email address to activate your account.</p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" class="button">Verify Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #10b981;">${verifyUrl}</p>
            <p>If you didn't create an account with NERD Study, please ignore this email.</p>
            <div class="footer">
              <p>This is an automated message from NERD Study. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Verify Your Email - NERD Study
      
      Hello,
      
      Thank you for signing up for NERD Study! Please verify your email address to activate your account.
      
      Click the link below to verify your email:
      ${verifyUrl}
      
      If you didn't create an account with NERD Study, please ignore this email.
      
      This is an automated message from NERD Study.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};
