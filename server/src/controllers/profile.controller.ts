// src/controllers/profile.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { ForbiddenError } from '../utils/errors';

function hasEditJobseekerPermission(req: Request): boolean {
  const perms = Array.isArray(req.user?.permissions) ? req.user!.permissions : [];
  const roles = Array.isArray(req.user?.roles) ? req.user!.roles : [];
  if (roles.map((r) => String(r).toUpperCase()).includes('ADMIN')) return true;
  return perms.map((p) => String(p).toUpperCase()).includes('EDIT_JOBSEEKER_PROFILE');
}

// Resolves which user's profile is being acted on. If a `user_id` query param is provided
// and refers to someone other than the authenticated user, the caller must hold
// EDIT_JOBSEEKER_PROFILE (or be ADMIN). Otherwise the request targets the caller themselves.
function resolveTargetUserId(req: Request): string {
  const self = req.user!.userId;
  const requested = String((req.query?.user_id ?? '') as string).trim();
  if (!requested || requested === self) return self;
  if (!hasEditJobseekerPermission(req)) {
    throw new ForbiddenError('Insufficient permissions to edit another user\'s profile');
  }
  return requested;
}

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  // Main profile
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const profile = await this.profileService.getProfile(userId);

      res.json({
        status: 'success',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const profile = await this.profileService.updateProfile(userId, req.body);

      res.json({
        status: 'success',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  };

  // Personal details
  getPersonalDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const details = await this.profileService.getPersonalDetails(userId);

      res.json({
        status: 'success',
        data: details
      });
    } catch (error) {
      next(error);
    }
  };

  upsertPersonalDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const details = await this.profileService.upsertPersonalDetails(userId, req.body);

      res.json({
        status: 'success',
        data: details
      });
    } catch (error) {
      next(error);
    }
  };

  uploadProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const file = req.file;

      if (!file || !file.buffer || !file.mimetype) {
        return res.status(400).json({
          status: 'error',
          error: { message: 'Profile picture file is required' },
        });
      }

      const saved = await this.profileService.uploadProfilePicture(userId, file.buffer, file.mimetype);

      res.json({
        status: 'success',
        data: {
          profile_picture_url: '/api/v1/profile/picture',
          profile_picture_updated_at: saved?.profile_picture_updated_at ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const picture = await this.profileService.getProfilePicture(userId);
      const raw = picture?.profile_picture_data as unknown;
      const mime = String(picture?.profile_picture_mime ?? '').trim();

      if (!(raw instanceof Buffer) || raw.length === 0) {
        return res.status(404).json({
          status: 'error',
          error: { message: 'Profile picture not found' },
        });
      }

      res.setHeader('Content-Type', mime || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.send(raw);
    } catch (error) {
      next(error);
    }
  };

  // Addresses
  getAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const addresses = await this.profileService.getAddresses(userId);

      res.json({
        status: 'success',
        data: addresses
      });
    } catch (error) {
      next(error);
    }
  };

  createAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const address = await this.profileService.createAddress(userId, req.body);

      res.status(201).json({
        status: 'success',
        data: address
      });
    } catch (error) {
      next(error);
    }
  };

  updateAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const addressId = String((req.params as any).addressId);
      const address = await this.profileService.updateAddress(addressId, userId, req.body);

      res.json({
        status: 'success',
        data: address
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const addressId = String((req.params as any).addressId);
      await this.profileService.deleteAddress(addressId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  setPrimaryAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const addressId = String((req.params as any).addressId);
      await this.profileService.setPrimaryAddress(addressId, userId);

      res.json({
        status: 'success',
        message: 'Primary address updated'
      });
    } catch (error) {
      next(error);
    }
  };

  // Education
  getEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const education = await this.profileService.getEducation(userId);

      res.json({
        status: 'success',
        data: education
      });
    } catch (error) {
      next(error);
    }
  };

  createEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const education = await this.profileService.createEducation(userId, req.body);

      res.status(201).json({
        status: 'success',
        data: education
      });
    } catch (error) {
      next(error);
    }
  };

  updateEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const educationId = String((req.params as any).educationId);
      const education = await this.profileService.updateEducation(educationId, userId, req.body);

      res.json({
        status: 'success',
        data: education
      });
    } catch (error) {
      next(error);
    }
  };

  deleteEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const educationId = String((req.params as any).educationId);
      await this.profileService.deleteEducation(educationId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Experience
  getExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const experience = await this.profileService.getExperience(userId);

      res.json({
        status: 'success',
        data: experience
      });
    } catch (error) {
      next(error);
    }
  };

  createExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const experience = await this.profileService.createExperience(userId, req.body);

      res.status(201).json({
        status: 'success',
        data: experience
      });
    } catch (error) {
      next(error);
    }
  };

  updateExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const experienceId = String((req.params as any).experienceId);
      const experience = await this.profileService.updateExperience(experienceId, userId, req.body);

      res.json({
        status: 'success',
        data: experience
      });
    } catch (error) {
      next(error);
    }
  };

  deleteExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const experienceId = String((req.params as any).experienceId);
      await this.profileService.deleteExperience(experienceId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // References
  getReferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const references = await this.profileService.getReferences(userId);

      res.json({
        status: 'success',
        data: references
      });
    } catch (error) {
      next(error);
    }
  };

  createReference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const reference = await this.profileService.createReference(userId, req.body);

      res.status(201).json({
        status: 'success',
        data: reference
      });
    } catch (error) {
      next(error);
    }
  };

  updateReference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const referenceId = String((req.params as any).referenceId);
      const reference = await this.profileService.updateReference(referenceId, userId, req.body);

      res.json({
        status: 'success',
        data: reference
      });
    } catch (error) {
      next(error);
    }
  };

  deleteReference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const referenceId = String((req.params as any).referenceId);
      await this.profileService.deleteReference(referenceId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Complete profile
  getCompleteProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = resolveTargetUserId(req);
      const profile = await this.profileService.getCompleteProfile(userId);

      res.json({
        status: 'success',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  };
}
