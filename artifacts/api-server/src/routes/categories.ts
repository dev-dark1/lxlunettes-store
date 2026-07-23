import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(categories.map((c) => ({
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
  })));
});

router.post("/categories", requireAdmin, async (req, res): Promise<void> => {
  const { name, slug, type, description, imageUrl, isActive = true } = req.body;
  const [cat] = await db.insert(categoriesTable).values({ name, slug, type, description, imageUrl, isActive }).returning();
  res.status(201).json({ ...cat, createdAt: cat.createdAt instanceof Date ? cat.createdAt.toISOString() : String(cat.createdAt) });
});

router.put("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, slug, type, description, imageUrl, isActive } = req.body;
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (slug !== undefined) update.slug = slug;
  if (type !== undefined) update.type = type;
  if (description !== undefined) update.description = description;
  if (imageUrl !== undefined) update.imageUrl = imageUrl;
  if (isActive !== undefined) update.isActive = isActive;
  const [cat] = await db.update(categoriesTable).set(update).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json({ ...cat, createdAt: cat.createdAt instanceof Date ? cat.createdAt.toISOString() : String(cat.createdAt) });
});

router.delete("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.sendStatus(204);
});

export default router;
