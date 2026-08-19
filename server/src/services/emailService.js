import { CLIENT_URL } from '../config/env.js';

function logEmail(message) {
  const recipients = (Array.isArray(message.to) ? message.to : [message.to])
    .map((recipient) => typeof recipient === 'string' ? recipient : recipient?.email)
    .filter(Boolean);

  console.info('\n[local email]');
  console.info(`To: ${recipients.join(', ')}`);
  console.info(`Subject: ${message.subject}`);
  console.info(message.text || message.html || '');
  console.info('[/local email]\n');

  return {
    success: true,
    provider: 'local-console',
    messageId: `local-${Date.now()}`,
  };
}

export async function sendEmail(options) {
  return logEmail(options);
}

export function buildVerificationEmail(email, token) {
  const url = `${CLIENT_URL}/verify-email?token=${token}`;

  return {
    to: email,
    subject: 'Verify your email',
    html: `Please verify your email by clicking: <a href="${url}">${url}</a>`,
    text: `Please verify your email by visiting: ${url}`,
  };
}

export function sendVerificationEmail(email, token) {
  return sendEmail(buildVerificationEmail(email, token));
}

export function buildPasswordResetEmail(email, token) {
  const url = `${CLIENT_URL}/reset-password?token=${token}`;

  return {
    to: email,
    subject: 'Reset your password',
    html: `Reset your password: <a href="${url}">${url}</a>`,
    text: `Reset your password by visiting: ${url}`,
  };
}

export function sendPasswordResetEmail(email, token) {
  return sendEmail(buildPasswordResetEmail(email, token));
}

export function buildProjectInviteEmail(email, token, projectName, inviterName) {
  const url = `${CLIENT_URL}/invites/${token}/accept`;
  const content = `${inviterName} invited you to join ${projectName} on Sprintly`;

  return {
    to: email,
    subject: `Invitation to join ${projectName}`,
    html: `${content}: <a href="${url}">${url}</a>`,
    text: `${content}: ${url}`,
  };
}

export function sendProjectInviteEmail(email, token, projectName, inviterName) {
  return sendEmail(buildProjectInviteEmail(email, token, projectName, inviterName));
}
