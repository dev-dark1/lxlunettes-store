import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, promotionsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth.js";

const router: IRouter = Router();

router.get("/promotions", async (req, res): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly === "true";
    const promos = activeOnly
      ? await db.select().from(promotionsTable).where(eq(promotionsTable.isActive, true)).orderBy(promotionsTable.createdAt)
      : await db.select().from(promotionsTable).orderBy(promotionsTable.createdAt);
    res.json(promos.map(formatPromotion));
  } catch (error) {
    console.error("Failed to fetch promotions", error);
    res.status(500).json({ error: "Impossible de charger les promotions." });
  }
});

router.post("/promotions", requireAdmin, async (req, res): Promise<void> => {
  try {
    const input = parsePromotion(req.body);
    if ("error" in input) {
      res.status(400).json({ error: input.error });
      return;
    }
    const [promo] = await db.insert(promotionsTable).values(input).returning();
    res.status(201).json(formatPromotion(promo));
  } catch (error) {
    console.error("Failed to create promotion", error);
    res.status(500).json({ error: "Impossible d’enregistrer la promotion dans Supabase." });
  }
});

router.put("/promotions/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const input = parsePromotion(req.body);
    if ("error" in input) {
      res.status(400).json({ error: input.error });
      return;
    }
    const [promo] = await db.update(promotionsTable).set(input).where(eq(promotionsTable.id, id)).returning();
    if (!promo) { res.status(404).json({ error: "Promotion introuvable." }); return; }
    res.json(formatPromotion(promo));
  } catch (error) {
    console.error("Failed to update promotion", error);
    res.status(500).json({ error: "Impossible de modifier la promotion." });
  }
});

router.delete("/promotions/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    await db.delete(promotionsTable).where(eq(promotionsTable.id, id));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete promotion", error);
    res.status(500).json({ error: "Impossible de supprimer la promotion." });
  }
});

function parsePromotion(body: Record<string, unknown>) {
  const label = String(body.label ?? "").trim();
  const discountType = body.discountType === "fixed" ? "fixed" : "percentage";
  const discountValue = Number(body.discountValue);
  const startDate = body.startDate ? new Date(String(body.startDate)) : null;
  const endDate = body.endDate ? new Date(String(body.endDate)) : null;
  if (!label) return { error: "Le nom de la promotion est obligatoire." };
  if (!Number.isFinite(discountValue) || discountValue <= 0) return { error: "La réduction doit être supérieure à zéro." };
  if (discountType === "percentage" && discountValue > 100) return { error: "Le pourcentage ne peut pas dépasser 100%." };
  if (startDate && Number.isNaN(startDate.getTime())) return { error: "La date de début est invalide." };
  if (endDate && Number.isNaN(endDate.getTime())) return { error: "La date de fin est invalide." };
  if (startDate && endDate && endDate < startDate) return { error: "La date de fin doit suivre la date de début." };
  return {
    label,
    discountType,
    discountValue: String(discountValue),
    startDate,
    endDate,
    appliesTo: String(body.appliesTo ?? "all"),
    targetId: body.targetId ? String(body.targetId) : null,
    isActive: body.isActive !== false,
  };
}

function formatPromotion(promo: typeof promotionsTable.$inferSelect) {
  return {
    ...promo,
    discountValue: Number(promo.discountValue),
    startDate: promo.startDate instanceof Date ? promo.startDate.toISOString() : (promo.startDate ?? null),
    endDate: promo.endDate instanceof Date ? promo.endDate.toISOString() : (promo.endDate ?? null),
    createdAt: promo.createdAt instanceof Date ? promo.createdAt.toISOString() : String(promo.createdAt),
  };
}

export default router;
