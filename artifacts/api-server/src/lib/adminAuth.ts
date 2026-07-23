import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const fallbackSecret = process.env.SESSION_SECRET && process.env.ADMIN_PASSWORD
  ? crypto.createHash("sha256").update(`${process.env.SESSION_SECRET}:${process.env.ADMIN_PASSWORD}`).digest("hex")
  : process.env.SESSION_SECRET;
const configuredSecret = process.env.ADMIN_JWT_SECRET ?? fallbackSecret;

if (!configuredSecret) {
  throw new Error("ADMIN_JWT_SECRET or SESSION_SECRET must be configured");
}
const JWT_SECRET: string = configuredSecret;

export function signAdminToken(adminId: string, email: string): string {
  return jwt.sign({ adminId, email, role: "admin" }, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): { adminId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { adminId: string; email: string };
    return payload;
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired admin token" });
    return;
  }
  (req as any).adminId = payload.adminId;
  (req as any).adminEmail = payload.email;
  next();
}
