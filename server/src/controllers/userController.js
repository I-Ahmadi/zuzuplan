import * as userService from '../services/userService.js';

async function getMe(req, res, next) {
  try {
    const user = await userService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateAvatar(req, res, next) {
  try {
    const { avatarUrl } = req.body;
    const user = await userService.updateAvatar(req.user.id, avatarUrl);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'No avatar uploaded', statusCode: 400 } });
      return;
    }
    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const user = await userService.updateAvatar(req.user.id, avatarUrl);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function getPreferences(req, res, next) {
  try {
    const preferences = await userService.getPreferences(req.user.id, req.query.scope);
    res.json({ success: true, data: preferences });
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const preferences = await userService.updatePreferences(req.user.id, req.body);
    res.json({ success: true, data: preferences });
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function getSessions(req, res, next) {
  try {
    const sessions = await userService.getSessions(req.user.id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
}

async function revokeOtherSessions(req, res, next) {
  try {
    await userService.revokeOtherSessions(req.user.id, req.body.currentRefreshToken);
    res.json({ success: true, message: 'Other sessions revoked' });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    await userService.resendVerification(req.user.id);
    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
}

export {
  getMe,
  updateMe,
  updateAvatar,
  uploadAvatar,
  getPreferences,
  updatePreferences,
  getUserById,
  getSessions,
  revokeOtherSessions,
  resendVerification,
};
