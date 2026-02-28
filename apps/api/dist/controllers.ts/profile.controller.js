"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profile_service_1 = require("../services/profile.service");
class ProfileController {
    constructor() {
        // Main profile
        this.getProfile = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const profile = await this.profileService.getProfile(userId);
                res.json({
                    status: 'success',
                    data: profile
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateProfile = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const profile = await this.profileService.updateProfile(userId, req.body);
                res.json({
                    status: 'success',
                    data: profile
                });
            }
            catch (error) {
                next(error);
            }
        };
        // Personal details
        this.getPersonalDetails = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const details = await this.profileService.getPersonalDetails(userId);
                res.json({
                    status: 'success',
                    data: details
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.upsertPersonalDetails = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const details = await this.profileService.upsertPersonalDetails(userId, req.body);
                res.json({
                    status: 'success',
                    data: details
                });
            }
            catch (error) {
                next(error);
            }
        };
        // Addresses
        this.getAddresses = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const addresses = await this.profileService.getAddresses(userId);
                res.json({
                    status: 'success',
                    data: addresses
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.createAddress = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const address = await this.profileService.createAddress(userId, req.body);
                res.status(201).json({
                    status: 'success',
                    data: address
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateAddress = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const addressId = String(req.params.addressId);
                const address = await this.profileService.updateAddress(addressId, userId, req.body);
                res.json({
                    status: 'success',
                    data: address
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteAddress = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const addressId = String(req.params.addressId);
                await this.profileService.deleteAddress(addressId, userId);
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        this.setPrimaryAddress = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const addressId = String(req.params.addressId);
                await this.profileService.setPrimaryAddress(addressId, userId);
                res.json({
                    status: 'success',
                    message: 'Primary address updated'
                });
            }
            catch (error) {
                next(error);
            }
        };
        // Education
        this.getEducation = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const education = await this.profileService.getEducation(userId);
                res.json({
                    status: 'success',
                    data: education
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.createEducation = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const education = await this.profileService.createEducation(userId, req.body);
                res.status(201).json({
                    status: 'success',
                    data: education
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateEducation = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const educationId = String(req.params.educationId);
                const education = await this.profileService.updateEducation(educationId, userId, req.body);
                res.json({
                    status: 'success',
                    data: education
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteEducation = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const educationId = String(req.params.educationId);
                await this.profileService.deleteEducation(educationId, userId);
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        // Experience
        this.getExperience = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const experience = await this.profileService.getExperience(userId);
                res.json({
                    status: 'success',
                    data: experience
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.createExperience = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const experience = await this.profileService.createExperience(userId, req.body);
                res.status(201).json({
                    status: 'success',
                    data: experience
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateExperience = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const experienceId = String(req.params.experienceId);
                const experience = await this.profileService.updateExperience(experienceId, userId, req.body);
                res.json({
                    status: 'success',
                    data: experience
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteExperience = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const experienceId = String(req.params.experienceId);
                await this.profileService.deleteExperience(experienceId, userId);
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        // References
        this.getReferences = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const references = await this.profileService.getReferences(userId);
                res.json({
                    status: 'success',
                    data: references
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.createReference = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const reference = await this.profileService.createReference(userId, req.body);
                res.status(201).json({
                    status: 'success',
                    data: reference
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateReference = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const referenceId = String(req.params.referenceId);
                const reference = await this.profileService.updateReference(referenceId, userId, req.body);
                res.json({
                    status: 'success',
                    data: reference
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteReference = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const referenceId = String(req.params.referenceId);
                await this.profileService.deleteReference(referenceId, userId);
                res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        // Complete profile
        this.getCompleteProfile = async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const profile = await this.profileService.getCompleteProfile(userId);
                res.json({
                    status: 'success',
                    data: profile
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.profileService = new profile_service_1.ProfileService();
    }
}
exports.ProfileController = ProfileController;
//# sourceMappingURL=profile.controller.js.map