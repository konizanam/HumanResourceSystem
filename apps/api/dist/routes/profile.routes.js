"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/profile.routes.ts
const express_1 = require("express");
const profile_controller_1 = require("../controllers.ts/profile.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const profileController = new profile_controller_1.ProfileController();
// All profile routes require authentication and job seeker role
router.use(auth_1.authenticate, auth_1.isJobSeeker);
// Main profile
router.get('/', profileController.getProfile);
router.patch('/', validation_1.profileUpdateValidation, validation_1.validateRequest, profileController.updateProfile);
// Personal details
router.get('/personal-details', profileController.getPersonalDetails);
router.put('/personal-details', validation_1.personalDetailsValidation, validation_1.validateRequest, profileController.upsertPersonalDetails);
// Addresses
router.get('/addresses', profileController.getAddresses);
router.post('/addresses', validation_1.addressValidation, validation_1.validateRequest, profileController.createAddress);
router.put('/addresses/:addressId', validation_1.addressValidation, validation_1.validateRequest, profileController.updateAddress);
router.delete('/addresses/:addressId', profileController.deleteAddress);
router.patch('/addresses/:addressId/primary', profileController.setPrimaryAddress);
// Education
router.get('/education', profileController.getEducation);
router.post('/education', validation_1.educationValidation, validation_1.validateRequest, profileController.createEducation);
router.put('/education/:educationId', validation_1.educationValidation, validation_1.validateRequest, profileController.updateEducation);
router.delete('/education/:educationId', profileController.deleteEducation);
// Experience
router.get('/experience', profileController.getExperience);
router.post('/experience', validation_1.experienceValidation, validation_1.validateRequest, profileController.createExperience);
router.put('/experience/:experienceId', validation_1.experienceValidation, validation_1.validateRequest, profileController.updateExperience);
router.delete('/experience/:experienceId', profileController.deleteExperience);
// References
router.get('/references', profileController.getReferences);
router.post('/references', validation_1.referenceValidation, validation_1.validateRequest, profileController.createReference);
router.put('/references/:referenceId', validation_1.referenceValidation, validation_1.validateRequest, profileController.updateReference);
router.delete('/references/:referenceId', profileController.deleteReference);
// Complete profile
router.get('/complete', profileController.getCompleteProfile);
exports.default = router;
//# sourceMappingURL=profile.routes.js.map