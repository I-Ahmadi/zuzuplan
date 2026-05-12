import * as githubService from '../services/githubService.js';

async function startOAuth(req, res, next) {
  try {
    const url = githubService.getGitHubOAuthUrl(req.query.projectId, req.user.id);
    res.json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
}

async function callback(req, res, next) {
  try {
    await githubService.completeGitHubOAuth(req.query.code, req.query.state);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/integrations?github=connected`);
  } catch (err) {
    next(err);
  }
}

async function webhook(req, res, next) {
  try {
    const verification = githubService.verifyGitHubSignature(req.body, req.get('x-hub-signature-256'));
    if (!verification.valid) {
      return res.status(401).json({ success: false, error: { message: 'Invalid GitHub webhook signature' } });
    }
    const event = req.get('x-github-event');
    const payload = JSON.parse(req.body.toString('utf8') || '{}');
    const result = await githubService.handleGitHubWebhook(event, payload);
    res.json({ success: true, data: result, signatureVerified: verification.configured });
  } catch (err) {
    next(err);
  }
}

export { startOAuth, callback, webhook };
