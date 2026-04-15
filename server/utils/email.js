import nodemailer from 'nodemailer';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';

let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else if (process.env.EMAIL_DEV_MODE !== 'true') {
  console.warn('Email: SMTP not configured. Set EMAIL_HOST, EMAIL_USER (and EMAIL_PASS) or EMAIL_DEV_MODE=true.');
}

export async function sendEmail(to, subject, html, text) {
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });
}

export function sendVerificationEmail(email, token) {
  const url = `${CLIENT_URL}/verify-email?token=${token}`;
  const html = `Please verify your email by clicking: <a href="${url}">${url}</a>`;
  return sendEmail(email, 'Verify your email', html);
}

export function sendPasswordResetEmail(email, token) {
  const url = `${CLIENT_URL}/reset-password?token=${token}`;
  const html = `Reset your password: <a href="${url}">${url}</a>`;
  return sendEmail(email, 'Reset your password', html);
}

export function sendNotificationEmail(email, subject, message) {
  const html = `<p>${message}</p>`;
  return sendEmail(email, subject, html);
}
