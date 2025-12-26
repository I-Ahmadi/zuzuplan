import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Development mode: log emails to console instead of sending
const EMAIL_DEV_MODE = process.env.EMAIL_DEV_MODE === 'true' || !process.env.EMAIL_HOST;

let transporter: nodemailer.Transporter | null = null;

if (!EMAIL_DEV_MODE && process.env.EMAIL_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  
  if (!transporter) {
    throw new Error('Email transporter not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env file');
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@zuzuplan.com',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html,
    });
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
  
  const html = `
    <h1>Verify Your Email</h1>
    <p>Please click the link below to verify your email address:</p>
    <a href="${verificationUrl}">${verificationUrl}</a>
    <p>This link will expire in 24 hours.</p>
  `;

  const text = `Verify Your Email\n\nPlease click the link below to verify your email address:\n${verificationUrl}\n\nThis link will expire in 24 hours.`;

  await sendEmail(email, 'Verify Your Email - ZuzuPlan', html, text);
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
  
  const html = `
    <h1>Reset Your Password</h1>
    <p>You requested to reset your password. Click the link below:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  const text = `Reset Your Password\n\nYou requested to reset your password. Click the link below:\n${resetUrl}\n\nThis link will expire in 1 hour.\nIf you didn't request this, please ignore this email.`;

  await sendEmail(email, 'Reset Your Password - ZuzuPlan', html, text);
};

export const sendNotificationEmail = async (
  email: string,
  subject: string,
  message: string
): Promise<void> => {
  const html = `
    <h2>${subject}</h2>
    <p>${message}</p>
    <p>Visit ZuzuPlan to view details.</p>
  `;

  await sendEmail(email, subject, html);
};

