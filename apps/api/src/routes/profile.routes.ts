// src/routes/profile.routes.ts
import { Router } from 'express';
import { ProfileController } from '../controllers.ts/profile.controller';
import { authenticate, isJobSeeker } from '../middleware/auth';
import {
  validateRequest,
  profileUpdateValidation,
  personalDetailsValidation,
  addressValidation,
  educationValidation,
  experienceValidation,
  referenceValidation
} from '../utils/validation';

const router = Router();
const profileController = new ProfileController();

// All profile routes require authentication and job seeker role
router.use(authenticate, isJobSeeker);

// Main profile
router.get('/', profileController.getProfile);
router.patch(
  '/',
  profileUpdateValidation,
  validateRequest,
  profileController.updateProfile
);

// Personal details
router.get('/personal-details', profileController.getPersonalDetails);
router.put(
  '/personal-details',
  personalDetailsValidation,
  validateRequest,
  profileController.upsertPersonalDetails
);

// Addresses
router.get('/addresses', profileController.getAddresses);
router.post(
  '/addresses',
  addressValidation,
  validateRequest,
  profileController.createAddress
);
router.put(
  '/addresses/:addressId',
  addressValidation,
  validateRequest,
  profileController.updateAddress
);
router.delete('/addresses/:addressId', profileController.deleteAddress);
router.patch('/addresses/:addressId/primary', profileController.setPrimaryAddress);

// Education
router.get('/education', profileController.getEducation);
router.post(
  '/education',
  educationValidation,
  validateRequest,
  profileController.createEducation
);
router.put(
  '/education/:educationId',
  educationValidation,
  validateRequest,
  profileController.updateEducation
);
router.delete('/education/:educationId', profileController.deleteEducation);

// Experience
router.get('/experience', profileController.getExperience);
router.post(
  '/experience',
  experienceValidation,
  validateRequest,
  profileController.createExperience
);
router.put(
  '/experience/:experienceId',
  experienceValidation,
  validateRequest,
  profileController.updateExperience
);
router.delete('/experience/:experienceId', profileController.deleteExperience);

// References
router.get('/references', profileController.getReferences);
router.post(
  '/references',
  referenceValidation,
  validateRequest,
  profileController.createReference
);
router.put(
  '/references/:referenceId',
  referenceValidation,
  validateRequest,
  profileController.updateReference
);
router.delete('/references/:referenceId', profileController.deleteReference);

// Complete profile
router.get('/complete', profileController.getCompleteProfile);

export default router;