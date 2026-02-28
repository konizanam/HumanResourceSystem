// src/services/profile.service.ts
import { DatabaseService } from './database.service';
import {
  JobSeekerProfile,
  JobSeekerPersonalDetails,
  JobSeekerAddress,
  JobSeekerEducation,
  JobSeekerExperience,
  JobSeekerReference,
  CompleteJobSeekerProfile
} from '../types';
import { NotFoundError } from '../utils/errors';

export class ProfileService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  // Profile methods
  async getProfile(userId: string): Promise<JobSeekerProfile> {
    const profile = await this.db.getJobSeekerProfile(userId);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    data: Partial<JobSeekerProfile>
  ): Promise<JobSeekerProfile> {
    return this.db.updateJobSeekerProfile(userId, data);
  }

  // Personal details methods
  async upsertPersonalDetails(
    userId: string,
    data: Partial<JobSeekerPersonalDetails>
  ): Promise<JobSeekerPersonalDetails> {
    return this.db.upsertPersonalDetails(userId, data);
  }

  async getPersonalDetails(userId: string): Promise<JobSeekerPersonalDetails | null> {
    return this.db.getPersonalDetails(userId);
  }

  // Address methods
  async createAddress(
    userId: string,
    data: Partial<JobSeekerAddress>
  ): Promise<JobSeekerAddress> {
    return this.db.createAddress(userId, data);
  }

  async updateAddress(
    addressId: string,
    userId: string,
    data: Partial<JobSeekerAddress>
  ): Promise<JobSeekerAddress> {
    return this.db.updateAddress(addressId, userId, data);
  }

  async getAddresses(userId: string): Promise<JobSeekerAddress[]> {
    return this.db.getAddresses(userId);
  }

  async deleteAddress(addressId: string, userId: string): Promise<void> {
    await this.db.deleteAddress(addressId, userId);
  }

  async setPrimaryAddress(addressId: string, userId: string): Promise<void> {
    await this.db.updateAddress(addressId, userId, { is_primary: true });
  }

  // Education methods
  async createEducation(
    userId: string,
    data: Partial<JobSeekerEducation>
  ): Promise<JobSeekerEducation> {
    return this.db.createEducation(userId, data);
  }

  async updateEducation(
    educationId: string,
    userId: string,
    data: Partial<JobSeekerEducation>
  ): Promise<JobSeekerEducation> {
    return this.db.updateEducation(educationId, userId, data);
  }

  async getEducation(userId: string): Promise<JobSeekerEducation[]> {
    return this.db.getEducation(userId);
  }

  async deleteEducation(educationId: string, userId: string): Promise<void> {
    await this.db.deleteEducation(educationId, userId);
  }

  // Experience methods
  async createExperience(
    userId: string,
    data: Partial<JobSeekerExperience>
  ): Promise<JobSeekerExperience> {
    return this.db.createExperience(userId, data);
  }

  async updateExperience(
    experienceId: string,
    userId: string,
    data: Partial<JobSeekerExperience>
  ): Promise<JobSeekerExperience> {
    return this.db.updateExperience(experienceId, userId, data);
  }

  async getExperience(userId: string): Promise<JobSeekerExperience[]> {
    return this.db.getExperience(userId);
  }

  async deleteExperience(experienceId: string, userId: string): Promise<void> {
    await this.db.deleteExperience(experienceId, userId);
  }

  // Reference methods
  async createReference(
    userId: string,
    data: Partial<JobSeekerReference>
  ): Promise<JobSeekerReference> {
    return this.db.createReference(userId, data);
  }

  async updateReference(
    referenceId: string,
    userId: string,
    data: Partial<JobSeekerReference>
  ): Promise<JobSeekerReference> {
    return this.db.updateReference(referenceId, userId, data);
  }

  async getReferences(userId: string): Promise<JobSeekerReference[]> {
    return this.db.getReferences(userId);
  }

  async deleteReference(referenceId: string, userId: string): Promise<void> {
    await this.db.deleteReference(referenceId, userId);
  }

  // Complete profile
  async getCompleteProfile(userId: string): Promise<CompleteJobSeekerProfile> {
    return this.db.getCompleteProfile(userId);
  }
}