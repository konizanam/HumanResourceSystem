import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth";

/* ------------------------------------------------------------------ */
/*  Storage configuration                                              */
/* ------------------------------------------------------------------ */

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Allowed: pdf, png, jpg, jpeg, doc, docx"
        )
      );
    }
  },
});

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

export const uploadRouter = Router();

uploadRouter.use(requireAuth);

/**
 * POST /api/upload
 * Upload a single file (field name: "file").
 * Returns the URL that can be used to access the file.
 */
uploadRouter.post("/", uploadMiddleware.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: { message: "No file uploaded" } });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  return res.status(201).json({
    message: "File uploaded successfully",
    file: {
      url: fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
});
