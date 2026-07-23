import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, adminUsersTable, otpRequestsTable } from "@workspace/db";
import { signAdminToken, requireAdmin } from "../lib/adminAuth";
import { logger } from "../lib/logger";
import { sendOtpEmail } from "../lib/mailer";

const router: IRouter = Router();

// POST /admin/auth/login
router.post("/admin/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email et mot de passe requis" }); return; }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, normalizedEmail));
  if (!admin || !admin.isActive) { res.status(401).json({ error: "Identifiants invalides" }); return; }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) { res.status(401).json({ error: "Identifiants invalides" }); return; }

  await db.update(adminUsersTable).set({ lastLoginAt: new Date() }).where(eq(adminUsersTable.id, admin.id));

  const token = signAdminToken(admin.id, admin.email);
  res.json({ token, admin: { id: admin.id, email: admin.email } });
});

// POST /admin/auth/logout
router.post("/admin/auth/logout", (_req, res): void => {
  // JWT is stateless; client discards token
  res.json({ message: "Déconnecté" });
});

// GET /admin/auth/me
router.get("/admin/auth/me", requireAdmin, async (req, res): Promise<void> => {
  const adminId = (req as any).adminId;
  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, adminId));
  if (!admin) { res.status(401).json({ error: "Non authentifié" }); return; }
  res.json({ id: admin.id, email: admin.email });
});

// POST /admin/auth/send-otp — fires OTP to hardcoded admin email, no body needed
router.post("/admin/auth/send-otp", async (_req, res): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) { res.status(500).json({ error: "ADMIN_EMAIL non configuré" }); return; }

  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (!admin || !admin.isActive) { res.status(404).json({ error: "Compte admin introuvable" }); return; }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(otpRequestsTable).values({ email, otpHash, expiresAt });

  await sendOtpEmail({ to: email, otp, subject: "Votre code d'accès LXLunettes" });

  res.json({ message: "Code envoyé" });
});

// POST /admin/auth/login-with-otp — verify OTP and return JWT
router.post("/admin/auth/login-with-otp", async (req, res): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const { otp } = req.body;
  if (!email || !otp) { res.status(400).json({ error: "Code requis" }); return; }

  const now = new Date();
  const requests = await db
    .select()
    .from(otpRequestsTable)
    .where(eq(otpRequestsTable.email, email));

  const validRequest = requests
    .filter((r) => !r.used && r.expiresAt > now && r.attemptsCount < 5)
    .sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime())[0];

  if (!validRequest) { res.status(400).json({ error: "Code invalide ou expiré" }); return; }

  await db.update(otpRequestsTable)
    .set({ attemptsCount: validRequest.attemptsCount + 1 })
    .where(eq(otpRequestsTable.id, validRequest.id));

  const valid = await bcrypt.compare(otp, validRequest.otpHash);
  if (!valid) { res.status(400).json({ error: "Code incorrect" }); return; }

  await db.update(otpRequestsTable).set({ used: true }).where(eq(otpRequestsTable.id, validRequest.id));

  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (!admin) { res.status(401).json({ error: "Compte introuvable" }); return; }

  await db.update(adminUsersTable).set({ lastLoginAt: new Date() }).where(eq(adminUsersTable.id, admin.id));

  const token = signAdminToken(admin.id, admin.email);
  res.json({ token, admin: { id: admin.id, email: admin.email } });
});

// POST /admin/auth/forgot-password
router.post("/admin/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  const allowedEmail = process.env.ADMIN_EMAIL;

  // Always return same response (security: don't reveal if email exists)
  const genericResponse = { message: "Si cet email est autorisé, un code OTP a été envoyé." };

  if (!allowedEmail || email !== allowedEmail) {
    // Silently ignore unauthorized emails
    res.json(genericResponse);
    return;
  }

  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (!admin) { res.json(genericResponse); return; }

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(otpRequestsTable).values({ email, otpHash, expiresAt });

  await sendOtpEmail({ to: email, otp, subject: "Votre code de récupération LXLunettes" });

  res.json(genericResponse);
});

// POST /admin/auth/verify-otp
router.post("/admin/auth/verify-otp", async (req, res): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) { res.status(400).json({ error: "Email et OTP requis" }); return; }

  const now = new Date();
  const requests = await db
    .select()
    .from(otpRequestsTable)
    .where(eq(otpRequestsTable.email, email));

  const validRequest = requests.find(
    (r) => !r.used && r.expiresAt > now && r.attemptsCount < 5
  );

  if (!validRequest) { res.status(400).json({ error: "Code invalide ou expiré" }); return; }

  await db.update(otpRequestsTable).set({ attemptsCount: validRequest.attemptsCount + 1 }).where(eq(otpRequestsTable.id, validRequest.id));

  const valid = await bcrypt.compare(otp, validRequest.otpHash);
  if (!valid) { res.status(400).json({ error: "Code invalide" }); return; }

  const resetToken = crypto.randomBytes(32).toString("hex");
  // Do NOT mark as used yet — reset-password will do that after the password is changed
  await db.update(otpRequestsTable).set({ resetToken }).where(eq(otpRequestsTable.id, validRequest.id));

  res.json({ resetToken });
});

// POST /admin/auth/reset-password
router.post("/admin/auth/reset-password", async (req, res): Promise<void> => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) { res.status(400).json({ error: "Token et nouveau mot de passe requis" }); return; }

  const [request] = await db.select().from(otpRequestsTable).where(eq(otpRequestsTable.resetToken, resetToken));
  if (!request || request.used || request.expiresAt < new Date()) {
    res.status(400).json({ error: "Token invalide ou expiré" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(adminUsersTable).set({ passwordHash }).where(eq(adminUsersTable.email, request.email));
  await db.update(otpRequestsTable).set({ used: true }).where(eq(otpRequestsTable.id, request.id));

  res.json({ message: "Mot de passe réinitialisé avec succès" });
});

export default router;
