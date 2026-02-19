// src/types/index.ts
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  password_reset_token?: string;
  password_reset_expires_at?: Date;
}

export interface JobSeekerProfile {
  user_id: string;
  professional_summary?: string;
  field_of_expertise?: string;
  qualification_level?: string;
  years_experience?: number;
  created_at: Date;
}

export interface JobSeekerPersonalDetails {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  gender?: string;
  date_of_birth?: Date;
  nationality?: string;
  id_type?: string;
  id_number?: string;
  id_document_url?: string;
  marital_status?: string;
  disability_status?: boolean;
  created_at: Date;
}

export interface JobSeekerAddress {
  id: string;
  user_id: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_primary: boolean;
}

export interface JobSeekerEducation {
  id: string;
  user_id: string;
  institution_name: string;
  qualification: string;
  field_of_study?: string;
  start_date?: Date;
  end_date?: Date;
  is_current: boolean;
  grade?: string;
  certificate_url?: string;
  created_at: Date;
}

export interface JobSeekerExperience {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  employment_type?: string;
  start_date?: Date;
  end_date?: Date;
  is_current: boolean;
  responsibilities?: string;
  salary?: number;
  reference_contact?: string;
  created_at: Date;
}

export interface JobSeekerReference {
  id: string;
  user_id: string;
  full_name: string;
  relationship?: string;
  company?: string;
  email?: string;
  phone?: string;
  created_at: Date;
}

export interface CompleteJobSeekerProfile {
  profile: JobSeekerProfile;
  personalDetails?: JobSeekerPersonalDetails;
  addresses: JobSeekerAddress[];
  education: JobSeekerEducation[];
  experience: JobSeekerExperience[];
  references: JobSeekerReference[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    roles: string[];
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
  export interface AuthRequest extends Request {
  user?: JwtPayload;
}
export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions?: string[];  // Add this line
}
}