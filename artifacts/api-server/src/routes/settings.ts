import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/adminAuth.js";

export const settingsRouter = Router();

// Seed defaults if needed
async function ensureDefaults() {
  const existing = await db.select().from(settingsTable);
  const keys = existing.map((r) => r.key);
  const defaults: Record<string, string> = {
    WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER ?? "212779524872",
    SOCIAL_FACEBOOK_URL: "",
    SOCIAL_FACEBOOK_ACTIVE: "false",
    SOCIAL_INSTAGRAM_URL: "",
    SOCIAL_INSTAGRAM_ACTIVE: "false",
    SOCIAL_PINTEREST_URL: "",
    SOCIAL_PINTEREST_ACTIVE: "false",
    SOCIAL_THREADS_URL: "",
    SOCIAL_THREADS_ACTIVE: "false",
    SOCIAL_TIKTOK_URL: "",
    SOCIAL_TIKTOK_ACTIVE: "false",
    SOCIAL_SNAPCHAT_URL: "",
    SOCIAL_SNAPCHAT_ACTIVE: "false",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!keys.includes(key)) {
      await db.insert(settingsTable).values({ key, value }).onConflictDoNothing();
    }
  }
}
ensureDefaults().catch(console.error);

// GET /api/admin/settings — returns all settings as key→value object
settingsRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const obj = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PUT /api/admin/settings/:key — update a single setting
settingsRouter.put("/:key", requireAdmin, async (req, res): Promise<void> => {
  const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
  const { value } = req.body;
  if (value === undefined) {
    res.status(400).json({ error: "value is required" });
    return;
  }
  try {
    await db
      .insert(settingsTable)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(value) } });
    res.json({ key, value: String(value) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});
