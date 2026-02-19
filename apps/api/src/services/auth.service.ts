// src/services/auth.service.ts
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { DatabaseService } from './database.service';
import { User, AuthResponse, JwtPayload } from '../types';
import { UnauthorizedError, ConflictError } from '../utils/errors';

export class AuthService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.db.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.db.createUser(firstName, lastName, email, passwordHash);

    // Assign JOB_SEEKER role
    await this.db.assignJobSeekerRole(user.id);

    // Create initial job seeker profile
    await this.db.createJobSeekerProfile(user.id, {});

    // Get user roles
    const roles = await this.db.getUserRoles(user.id);

    // Generate token
    const token = this.generateToken(user, roles);

    return {
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles
      }
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Get user
    const user = await this.db.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Get user roles
    const roles = await this.db.getUserRoles(user.id);

    // Generate token
    const token = this.generateToken(user, roles);

    return {
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles
      }
    };
  }

  private generateToken(user: User, roles: string[]): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roles
    };

    // Fix: Ensure JWT_SECRET is a string and handle expiration properly
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    // Fix: Use expiresIn as a string in the options object
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const options: SignOptions = { expiresIn: expiresIn as any };
    
    return jwt.sign(payload, jwtSecret, options);
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }
      
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}