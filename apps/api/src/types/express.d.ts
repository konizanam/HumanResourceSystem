import { File } from 'multer';

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