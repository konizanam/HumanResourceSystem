import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  // Main profile
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
      const details = await this.profileService.upsertPersonalDetails(userId, req.body);
      
      res.json({
        status: 'success',
        data: details
      });
    } catch (error) {
      next(error);
    }
  };

  // Addresses
  getAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
      const { addressId } = req.params;
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
      const userId = req.user!.userId;
      const { addressId } = req.params;
      await this.profileService.deleteAddress(addressId, userId);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  setPrimaryAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { addressId } = req.params;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
      const { educationId } = req.params;
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
      const userId = req.user!.userId;
      const { educationId } = req.params;
      await this.profileService.deleteEducation(educationId, userId);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Experience
  getExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
      const { experienceId } = req.params;
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
      const userId = req.user!.userId;
      const { experienceId } = req.params;
      await this.profileService.deleteExperience(experienceId, userId);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // References
  getReferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
      const { referenceId } = req.params;
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
      const userId = req.user!.userId;
      const { referenceId } = req.params;
      await this.profileService.deleteReference(referenceId, userId);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // Complete profile
  getCompleteProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
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