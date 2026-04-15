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

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export { getMe, updateMe, updateAvatar, getUserById };
