// src/routes/index.ts
import { Router } from 'express';
import { authRouter } from './auth.routes';
import profileRouter from './profile.routes';

const router = Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

export default router;