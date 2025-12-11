import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@zuzuplan.com',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
  
  const html = `
    <h1>Verify Your Email</h1>
    <p>Please click the link below to verify your email address:</p>
    <a href="${verificationUrl}">${verificationUrl}</a>
    <p>This link will expire in 24 hours.</p>
  `;

  await sendEmail(email, 'Verify Your Email - ZuzuPlan', html);
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
  
  const html = `
    <h1>Reset Your Password</h1>
    <p>You requested to reset your password. Click the link below:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  await sendEmail(email, 'Reset Your Password - ZuzuPlan', html);
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

