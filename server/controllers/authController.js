import * as authService from '../services/authService.js';

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(name, email, password);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });

  } catch (err) {
    console.error(`An error occurred during registration: ${err.message}`);
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    res.status(200).json({ 
      success: true, 
      message: 'User logged in successfully',
      data: result,
    });

  } catch (err) {
    console.error(`An error occurred during login: ${err.message}`);
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const { token } = req.body;
    const result = await authService.refreshToken(token);

    res.status(200).json({ 
      success: true, 
      message: 'Token refreshed successfully',
      data: result 
    });

  } catch (err) {
    console.error(`An error occurred during token refresh: ${err.message}`);
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const { token } = req.body;
    await authService.logout(token);

    res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });

  } catch (err) {
    console.error(`An error occurred during logout: ${err.message}`);
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const user = await authService.verifyEmail(token);

    res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully',
      data: user
    });

  } catch (err) {
    console.error(`An error occurred during email verification: ${err.message}`);
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    res.status(200).json({ 
      success: true, 
      message: 'If the email exists, a reset link was sent' 
    });

  } catch (err) {
    console.error(`An error occurred during forget password: ${err.message}`);
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (err) {
    console.error(`An error occurred during password reset: ${err.message}`);
    next(err);
  }
}
