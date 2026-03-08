import { Router } from 'express';
import { registerSchema, loginSchema } from '@kova/shared';
import { validate } from '../middleware/validate.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { AuthService, AppError } from '../services/auth.service.js';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    res.cookie('token', result.token, COOKIE_OPTIONS);
    res.status(201).json({ user: result.user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    res.cookie('token', result.token, COOKIE_OPTIONS);
    res.json({ user: result.user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});

// Returns the JWT for WebSocket authentication (httpOnly cookie is not accessible from JS)
router.get('/ws-token', authenticate, (req: AuthRequest, res) => {
  const token = req.cookies?.token;
  res.json({ token });
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await AuthService.getUser(req.userId!);
    res.json({ user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

export default router;
