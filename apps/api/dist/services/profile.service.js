"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
// src/services/profile.service.ts
const database_service_1 = require("./database.service");
const errors_1 = require("../utils/errors");
class ProfileService {
    constructor() {
        this.db = new database_service_1.DatabaseService();
    }
    // Profile methods
    async getProfile(userId) {
        const profile = await this.db.getJobSeekerProfile(userId);
        if (!profile) {
            throw new errors_1.NotFoundError('Profile not found');
        }
        return profile;
    }
    async updateProfile(userId, data) {
        return this.db.updateJobSeekerProfile(userId, data);
    }
    // Personal details methods
    async upsertPersonalDetails(userId, data) {
        return this.db.upsertPersonalDetails(userId, data);
    }
    async getPersonalDetails(userId) {
        return this.db.getPersonalDetails(userId);
    }
    // Address methods
    async createAddress(userId, data) {
        return this.db.createAddress(userId, data);
    }
    async updateAddress(addressId, userId, data) {
        return this.db.updateAddress(addressId, userId, data);
    }
    async getAddresses(userId) {
        return this.db.getAddresses(userId);
    }
    async deleteAddress(addressId, userId) {
        await this.db.deleteAddress(addressId, userId);
    }
    async setPrimaryAddress(addressId, userId) {
        await this.db.updateAddress(addressId, userId, { is_primary: true });
    }
    // Education methods
    async createEducation(userId, data) {
        return this.db.createEducation(userId, data);
    }
    async updateEducation(educationId, userId, data) {
        return this.db.updateEducation(educationId, userId, data);
    }
    async getEducation(userId) {
        return this.db.getEducation(userId);
    }
    async deleteEducation(educationId, userId) {
        await this.db.deleteEducation(educationId, userId);
    }
    // Experience methods
    async createExperience(userId, data) {
        return this.db.createExperience(userId, data);
    }
    async updateExperience(experienceId, userId, data) {
        return this.db.updateExperience(experienceId, userId, data);
    }
    async getExperience(userId) {
        return this.db.getExperience(userId);
    }
    async deleteExperience(experienceId, userId) {
        await this.db.deleteExperience(experienceId, userId);
    }
    // Reference methods
    async createReference(userId, data) {
        return this.db.createReference(userId, data);
    }
    async updateReference(referenceId, userId, data) {
        return this.db.updateReference(referenceId, userId, data);
    }
    async getReferences(userId) {
        return this.db.getReferences(userId);
    }
    async deleteReference(referenceId, userId) {
        await this.db.deleteReference(referenceId, userId);
    }
    // Complete profile
    async getCompleteProfile(userId) {
        return this.db.getCompleteProfile(userId);
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=profile.service.js.map