import { BrevoClient, BrevoError, BrevoTimeoutError } from '@getbrevo/brevo';

const BREVO_TIMEOUT_SECONDS = Number(process.env.BREVO_TIMEOUT_SECONDS || 30);
const BREVO_MAX_RETRIES = Number(process.env.BREVO_MAX_RETRIES || 2);

export class EmailServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'EmailServiceError';
    this.code = options.code || 'EMAIL_DELIVERY_FAILED';
    this.statusCode = options.statusCode;
    this.retryAfter = options.retryAfter;
    Object.setPrototypeOf(this, EmailServiceError.prototype);
  }
}

function getSender() {
  return {
    email: process.env.BREVO_SENDER_EMAIL,
    name: process.env.BREVO_SENDER_NAME || undefined,
  };
}

function redactEmail(email = '') {
  const [localPart, domain] = String(email).split('@');
  if (!localPart || !domain) return 'invalid-recipient';
  return `${localPart.slice(0, 2)}***@${domain}`;
}

function toRecipientList(value) {
  if (!value) return undefined;
  const recipients = Array.isArray(value) ? value : [value];

  return recipients.map((recipient) => {
    if (typeof recipient === 'string') {
      return { email: recipient };
    }

    return {
      email: recipient.email,
      name: recipient.name,
    };
  });
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function logEmailEvent(level, event, details = {}, logger = console) {
  logger[level](
    JSON.stringify({
      event,
      provider: 'brevo',
      ...details,
    }),
  );
}

function requireBrevoConfig(config = process.env) {
  const required = ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new EmailServiceError(`Brevo email configuration is missing: ${missing.join(', ')}`, {
      code: 'EMAIL_CONFIGURATION_MISSING',
    });
  }
}

function buildBrevoPayload(message) {
  const to = toRecipientList(message.to);

  if (!to?.length) {
    throw new EmailServiceError('Email recipient is required.', {
      code: 'EMAIL_RECIPIENT_REQUIRED',
    });
  }

  if (!message.subject) {
    throw new EmailServiceError('Email subject is required.', {
      code: 'EMAIL_SUBJECT_REQUIRED',
    });
  }

  if (!message.html && !message.text) {
    throw new EmailServiceError('Email html or text content is required.', {
      code: 'EMAIL_CONTENT_REQUIRED',
    });
  }

  const payload = {
    sender: message.sender || getSender(),
    to,
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text || stripHtml(message.html),
    cc: toRecipientList(message.cc),
    bcc: toRecipientList(message.bcc),
    replyTo: message.replyTo,
    attachment: message.attachments,
    tags: message.tags,
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
}

function normalizeBrevoError(error) {
  if (error instanceof BrevoTimeoutError) {
    return new EmailServiceError('Email provider request timed out.', {
      code: 'EMAIL_PROVIDER_TIMEOUT',
    });
  }

  if (error instanceof BrevoError) {
    const retryAfter = error.rawResponse?.headers?.['retry-after'];
    const codeByStatus = {
      400: 'EMAIL_PROVIDER_BAD_REQUEST',
      401: 'EMAIL_PROVIDER_AUTH_FAILED',
      403: 'EMAIL_PROVIDER_FORBIDDEN',
      422: 'EMAIL_PROVIDER_REJECTED_RECIPIENT',
      429: 'EMAIL_PROVIDER_RATE_LIMITED',
    };

    return new EmailServiceError('Email provider rejected the request.', {
      code: codeByStatus[error.statusCode] || 'EMAIL_PROVIDER_ERROR',
      statusCode: error.statusCode,
      retryAfter,
    });
  }

  return new EmailServiceError('Email provider request failed.', {
    code: 'EMAIL_PROVIDER_NETWORK_ERROR',
  });
}

export function createEmailService({ client, logger = console } = {}) {
  let brevoClient = client;

  function getClient() {
    if (!brevoClient) {
      brevoClient = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY || '',
        timeoutInSeconds: BREVO_TIMEOUT_SECONDS,
        maxRetries: BREVO_MAX_RETRIES,
      });
    }

    return brevoClient;
  }

  return {
    assertConfigured() {
      requireBrevoConfig();
      logEmailEvent('info', 'email_configuration_ready', {
        sender: redactEmail(process.env.BREVO_SENDER_EMAIL),
      }, logger);
    },

    async sendEmail(message) {
      requireBrevoConfig();
      const payload = buildBrevoPayload(message);
      const recipients = payload.to.map((recipient) => redactEmail(recipient.email));

      try {
        const result = await getClient().transactionalEmails.sendTransacEmail(payload);
        logEmailEvent('info', 'email_sent', {
          messageId: result.messageId,
          recipients,
          subject: payload.subject,
        }, logger);

        return {
          success: true,
          provider: 'brevo',
          messageId: result.messageId,
        };
      } catch (error) {
        const normalized = normalizeBrevoError(error);
        logEmailEvent('error', 'email_failed', {
          code: normalized.code,
          statusCode: normalized.statusCode,
          retryAfter: normalized.retryAfter,
          recipients,
          subject: payload.subject,
        }, logger);
        throw normalized;
      }
    },
  };
}

export const emailService = createEmailService();

export function verifyEmailProvider() {
  emailService.assertConfigured();
}

export function sendEmail(options) {
  return emailService.sendEmail(options);
}

export function buildVerificationEmail(email, token) {
  const clientUrl = process.env.CLIENT_URL || '';
  const url = `${clientUrl}/verify-email?token=${token}`;
  const html = `Please verify your email by clicking: <a href="${url}">${url}</a>`;
  const text = `Please verify your email by visiting: ${url}`;

  return {
    to: email,
    subject: 'Verify your email',
    html,
    text,
    tags: ['verification'],
  };
}

export function sendVerificationEmail(email, token) {
  return sendEmail(buildVerificationEmail(email, token));
}

export function buildPasswordResetEmail(email, token) {
  const clientUrl = process.env.CLIENT_URL || '';
  const url = `${clientUrl}/reset-password?token=${token}`;
  const html = `Reset your password: <a href="${url}">${url}</a>`;
  const text = `Reset your password by visiting: ${url}`;

  return {
    to: email,
    subject: 'Reset your password',
    html,
    text,
    tags: ['password-reset'],
  };
}

export function sendPasswordResetEmail(email, token) {
  return sendEmail(buildPasswordResetEmail(email, token));
}

export function buildProjectInviteEmail(email, token, projectName, inviterName) {
  const clientUrl = process.env.CLIENT_URL || '';
  const url = `${clientUrl}/invites/${token}/accept`;
  const html = `${inviterName} invited you to join ${projectName} on Sprintly: <a href="${url}">${url}</a>`;
  const text = `${inviterName} invited you to join ${projectName} on Sprintly: ${url}`;

  return {
    to: email,
    subject: `Invitation to join ${projectName}`,
    html,
    text,
    tags: ['project-invite'],
  };
}

export function sendProjectInviteEmail(email, token, projectName, inviterName) {
  return sendEmail(buildProjectInviteEmail(email, token, projectName, inviterName));
}
