import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);

    res.status(201).json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("An error occurred while registering: ", error);
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("An error occurred while logging in: ", error);
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const result = await authService.refreshToken(token);

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("An error occurred while refreshing token: ", error);
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    await authService.logout(token);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error("An error occurred while logging out: ", error);
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    await authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });

  } catch (error) {
    console.error("An error occurred while verifying email: ", error);
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });

  } catch (error) {
    console.error("An error occurred while forgot password: ", error);
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error("An error occurred while resetting password: ", error);
    next(error);
  }
};
