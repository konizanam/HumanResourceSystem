import { File } from 'multer';

interface AuthUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      file?: File;
      files?: File[] | { [fieldname: string]: File[] };
    }
  }
}
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}