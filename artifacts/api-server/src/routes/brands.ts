import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

router.get("/brands", async (req, res): Promise<void> => {
  const activeOnly = req.query.activeOnly === "true";
  let q = db.select().from(brandsTable).orderBy(brandsTable.name);
  const brands = activeOnly
    ? await db.select().from(brandsTable).where(eq(brandsTable.isActive, true)).orderBy(brandsTable.name)
    : await db.select().from(brandsTable).orderBy(brandsTable.name);
  res.json(brands.map((b) => ({ ...b, createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt) })));
});

router.post("/brands", requireAdmin, async (req, res): Promise<void> => {
  const { name, slug, description, logoUrl, isActive = true } = req.body;
  const [brand] = await db.insert(brandsTable).values({ name, slug, description, logoUrl, isActive }).returning();
  res.status(201).json({ ...brand, createdAt: brand.createdAt instanceof Date ? brand.createdAt.toISOString() : String(brand.createdAt) });
});

router.put("/brands/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, slug, description, logoUrl, isActive } = req.body;
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (slug !== undefined) update.slug = slug;
  if (description !== undefined) update.description = description;
  if (logoUrl !== undefined) update.logoUrl = logoUrl;
  if (isActive !== undefined) update.isActive = isActive;
  const [brand] = await db.update(brandsTable).set(update).where(eq(brandsTable.id, id)).returning();
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }
  res.json({ ...brand, createdAt: brand.createdAt instanceof Date ? brand.createdAt.toISOString() : String(brand.createdAt) });
});

router.delete("/brands/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(brandsTable).where(eq(brandsTable.id, id));
  res.sendStatus(204);
});

export default router;
