import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../lib/adminAuth.js";

export const uploadRouter = Router();

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Type de fichier non supporté: ${file.mimetype}`));
  },
});

// Files must live in durable object storage because Vercel Functions have a
// read-only, ephemeral filesystem.
uploadRouter.post(
  "/upload",
  requireAdmin,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier reçu" });
      return;
    }

    try {
      const supabaseUrl =
        process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_ANON_KEY ??
        process.env.VITE_SUPABASE_ANON_PUBLIC;
      const bucket = process.env.VITE_SUPABASE_BUCKET ?? "lxlunettes";

      if (!supabaseUrl || !supabaseKey) {
        res.status(503).json({ error: "Supabase Storage non configuré" });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const base =
        path
          .basename(req.file.originalname, ext)
          .replace(/[^a-z0-9_-]/gi, "_")
          .slice(0, 60) || "media";
      const filename = `media/${base}_${randomUUID()}${ext}`;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);
      const isVideo = req.file.mimetype.startsWith("video/");

      res.json({
        url: publicUrl.publicUrl,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        type: isVideo ? "video" : "image",
        mimetype: req.file.mimetype,
      });
    } catch (error) {
      next(error);
    }
  },
);

uploadRouter.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    res.status(400).json({ error: err.message });
  },
);
