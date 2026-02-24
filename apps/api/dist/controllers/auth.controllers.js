"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
class AuthController {
    constructor() {
        this.register = async (req, res, next) => {
            try {
                const { first_name, last_name, email, password } = req.body;
                const result = await this.authService.register(first_name, last_name, email, password);
                res.status(201).json({
                    status: 'success',
                    data: result
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.login = async (req, res, next) => {
            try {
                const { email, password } = req.body;
                const result = await this.authService.login(email, password);
                res.json({
                    status: 'success',
                    data: result
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getMe = async (req, res, next) => {
            try {
                res.json({
                    status: 'success',
                    data: {
                        user: req.user
                    }
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.authService = new auth_service_1.AuthService();
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controllers.js.map