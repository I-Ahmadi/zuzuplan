import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { BrevoError } from '@getbrevo/brevo';
import {
  EmailServiceError,
  buildPasswordResetEmail,
  buildProjectInviteEmail,
  buildVerificationEmail,
  createEmailService,
} from './emailService.js';

const originalEnv = { ...process.env };

function createLogger() {
  const entries = [];
  return {
    entries,
    info: (message) => entries.push({ level: 'info', ...JSON.parse(message) }),
    error: (message) => entries.push({ level: 'error', ...JSON.parse(message) }),
  };
}

beforeEach(() => {
  process.env.BREVO_API_KEY = 'test-key';
  process.env.BREVO_SENDER_EMAIL = 'sender@example.com';
  process.env.BREVO_SENDER_NAME = 'Sprintly';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

test('sends html and text email through Brevo', async () => {
  const sentPayloads = [];
  const logger = createLogger();
  const service = createEmailService({
    logger,
    client: {
      transactionalEmails: {
        sendTransacEmail: async (payload) => {
          sentPayloads.push(payload);
          return { messageId: 'message-123' };
        },
      },
    },
  });

  const result = await service.sendEmail({
    to: 'person@example.com',
    subject: 'Hello',
    html: '<p>Hello</p>',
    text: 'Hello',
    cc: [{ email: 'copy@example.com', name: 'Copy Person' }],
    bcc: 'hidden@example.com',
    replyTo: { email: 'reply@example.com', name: 'Support' },
    attachments: [{ name: 'report.txt', content: 'cmVwb3J0' }],
  });

  assert.deepEqual(result, {
    success: true,
    provider: 'brevo',
    messageId: 'message-123',
  });
  assert.equal(sentPayloads[0].sender.email, 'sender@example.com');
  assert.equal(sentPayloads[0].sender.name, 'Sprintly');
  assert.deepEqual(sentPayloads[0].to, [{ email: 'person@example.com' }]);
  assert.deepEqual(sentPayloads[0].cc, [{ email: 'copy@example.com', name: 'Copy Person' }]);
  assert.deepEqual(sentPayloads[0].bcc, [{ email: 'hidden@example.com' }]);
  assert.deepEqual(sentPayloads[0].replyTo, { email: 'reply@example.com', name: 'Support' });
  assert.deepEqual(sentPayloads[0].attachment, [{ name: 'report.txt', content: 'cmVwb3J0' }]);
  assert.equal(logger.entries.at(-1).event, 'email_sent');
});

test('normalizes Brevo API failures without leaking provider body details', async () => {
  const logger = createLogger();
  const service = createEmailService({
    logger,
    client: {
      transactionalEmails: {
        sendTransacEmail: async () => {
          throw new BrevoError({
            message: 'Too many requests',
            statusCode: 429,
            body: { apiKey: 'secret-value' },
            rawResponse: { headers: { 'retry-after': '30' } },
          });
        },
      },
    },
  });

  await assert.rejects(
    () => service.sendEmail({
      to: 'person@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
    }),
    (error) => {
      assert.ok(error instanceof EmailServiceError);
      assert.equal(error.message, 'Email provider rejected the request.');
      assert.equal(error.code, 'EMAIL_PROVIDER_RATE_LIMITED');
      assert.equal(error.statusCode, 429);
      assert.equal(error.retryAfter, '30');
      assert.equal(error.message.includes('secret-value'), false);
      return true;
    },
  );

  assert.equal(logger.entries.at(-1).event, 'email_failed');
  assert.equal(logger.entries.at(-1).code, 'EMAIL_PROVIDER_RATE_LIMITED');
});

test('requires Brevo credentials before sending', async () => {
  delete process.env.BREVO_API_KEY;
  const service = createEmailService({
    client: {
      transactionalEmails: {
        sendTransacEmail: async () => ({ messageId: 'unused' }),
      },
    },
  });

  await assert.rejects(
    () => service.sendEmail({
      to: 'person@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
    }),
    /Brevo email configuration is missing: BREVO_API_KEY/,
  );
});

test('renders transactional email payloads with the expected links and tags', () => {
  process.env.CLIENT_URL = 'https://app.example.com';

  const verification = buildVerificationEmail('user@example.com', 'verify-token');
  assert.equal(verification.subject, 'Verify your email');
  assert.match(verification.html, /https:\/\/app\.example\.com\/verify-email\?token=verify-token/);
  assert.deepEqual(verification.tags, ['verification']);

  const reset = buildPasswordResetEmail('user@example.com', 'reset-token');
  assert.equal(reset.subject, 'Reset your password');
  assert.match(reset.text, /https:\/\/app\.example\.com\/reset-password\?token=reset-token/);
  assert.deepEqual(reset.tags, ['password-reset']);

  const invite = buildProjectInviteEmail('user@example.com', 'invite-token', 'Launch Plan', 'Maya');
  assert.equal(invite.subject, 'Invitation to join Launch Plan');
  assert.match(invite.html, /Maya invited you to join Launch Plan/);
  assert.match(invite.text, /https:\/\/app\.example\.com\/invites\/invite-token\/accept/);
  assert.deepEqual(invite.tags, ['project-invite']);
});
