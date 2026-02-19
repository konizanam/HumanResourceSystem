// src/routes/index.ts
import { Router } from 'express';
import { authRouter } from './auth.routes';
import profileRouter from './profile.routes';
import companyRoutes  from './company.routes';
import documentRoutes from './document.routes';
import { meRouter } from './me';
const router = Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/companies', companyRoutes);
router.use('/documents', documentRoutes);
router.use('/users', meRouter);
// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

export default router;