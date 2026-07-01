import nodemailer from 'nodemailer';

const CLIENT_URL     = process.env.CLIENT_URL || 'http://localhost:5173';
const EMAIL_DEV_MODE = process.env.EMAIL_DEV_MODE === 'true';
const IS_PRODUCTION  = process.env.NODE_ENV === 'production';

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
    if (EMAIL_DEV_MODE) {
      console.info(`Email dev mode: ${subject} -> ${to}`);
      console.info(text || html.replace(/<[^>]*>/g, ''));
      return;
    }
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
    if (EMAIL_DEV_MODE) {
      console.info('Email transport: dev mode enabled; SMTP verification skipped.');
      return;
    }
    throw new Error('SMTP is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.');
  }

  try {
    await transporter.verify();
    console.info('Email transport: SMTP connection verified successfully.');
  } catch (error) {
    if (IS_PRODUCTION) {
      throw error;
    }

    console.warn(`Email transport: SMTP verification failed (${error.code || error.message}). Continuing without blocking startup.`);
  }
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

export function sendProjectInviteEmail(email, token, projectName, inviterName) {
  const url = `${CLIENT_URL}/invites/${token}/accept`;
  const html = `${inviterName} invited you to join ${projectName} on Sprintly: <a href="${url}">${url}</a>`;
  return sendEmail(email, `Invitation to join ${projectName}`, html);
}
