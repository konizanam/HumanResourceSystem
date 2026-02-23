import { Router } from 'express';
import { authRouter } from './auth.routes';
import profileRouter from './profile.routes';
import companyRoutes from './company.routes';
import documentRoutes from './document.routes';
import { meRouter } from './me';
import { geoRouter } from './geo.routes';
import emailTemplatesRoutes from './emailTemplates.routes';
import jobRoutes from './jobRoutes';
import applicationRoutes from './applicationRoutes';
import employerRoutes from './employerRoutes';
import jobSeekerResumeRoutes from './jobSeekerResumeRoutes';
import jobSeekerSkillsRoutes from './jobSeekerSkillsRoutes';
import jobSeekerCertificationsRoutes from './jobSeekerCertificationsRoutes';
import notificationsRoutes from './notificationsRoutes';
import adminRoutes from './adminRoutes'; // Add this

const router = Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/companies', companyRoutes);
router.use('/documents', documentRoutes);
router.use('/users', meRouter);
router.use('/geo', geoRouter);
router.use('/email-templates', emailTemplatesRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/employers', employerRoutes);
router.use('/job-seeker/resume', jobSeekerResumeRoutes);
router.use('/job-seeker/skills', jobSeekerSkillsRoutes);
router.use('/job-seeker/certifications', jobSeekerCertificationsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/admin', adminRoutes); // Add this

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

export default router;