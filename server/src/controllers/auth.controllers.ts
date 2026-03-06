// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { first_name, last_name, email, password } = req.body;
      
      const result = await this.authService.register(
        first_name,
        last_name,
        email,
        password
      );

      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      
      const result = await this.authService.login(email, password);

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        status: 'success',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  };
}