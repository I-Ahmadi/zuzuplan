import nodemailer from 'nodemailer';

const CLIENT_URL     = process.env.CLIENT_URL || 'http://localhost:5173';
const EMAIL_DEV_MODE = process.env.EMAIL_DEV_MODE === 'true';

let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else if (!EMAIL_DEV_MODE) {
  console.warn('Email: SMTP not configured. Set EMAIL_HOST, EMAIL_USER (and EMAIL_PASS) or EMAIL_DEV_MODE=true.');
}

export async function sendEmail(to, subject, html, text) {
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: to,
    subject: subject,
    html: html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });
}

export async function verifyEmailTransport() {
  if (!transporter) {
    throw new Error('SMTP is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.');
  }

  await transporter.verify();
  console.info('Email transport: SMTP connection verified successfully.');
}

export function sendVerificationEmail(email, token) {
  const url  = `${CLIENT_URL}/verify-email?token=${token}`;
  const html = `Please verify your email by clicking: <a href="${url}">${url}</a>`;
  return sendEmail(email, 'Verify your email', html);
}

export function sendPasswordResetEmail(email, token) {
  const url  = `${CLIENT_URL}/reset-password?token=${token}`;
  const html = `Reset your password: <a href="${url}">${url}</a>`;
  return sendEmail(email, 'Reset your password', html);
}

export function sendNotificationEmail(email, subject, message) {
  const html = `<p>${message}</p>`;
  return sendEmail(email, subject, html);
}
