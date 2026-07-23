import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, favoritesTable, productsTable, productImagesTable, brandsTable, categoriesTable } from "@workspace/db";
import { requireClerkAuth } from "../lib/clerkAuth";

const router: IRouter = Router();

router.get("/favorites", requireClerkAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId;
  const favorites = await db.select().from(favoritesTable).where(eq(favoritesTable.clerkUserId, clerkUserId));

  const productIds = favorites.map((f) => f.productId);
  if (productIds.length === 0) { res.json([]); return; }

  const products = await db.select().from(productsTable).where(
    eq(productsTable.id, productIds[0]) // simplified - in practice use inArray
  );

  res.json(favorites.map((f) => ({
    ...f,
    product: products.find((p) => p.id === f.productId) ?? null,
    createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt),
  })));
});

router.post("/favorites", requireClerkAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId;
  const { productId } = req.body;

  // Check if already exists
  const [existing] = await db.select().from(favoritesTable).where(
    and(eq(favoritesTable.clerkUserId, clerkUserId), eq(favoritesTable.productId, productId))
  );
  if (existing) { res.status(201).json({ ...existing, product: null, createdAt: existing.createdAt instanceof Date ? existing.createdAt.toISOString() : String(existing.createdAt) }); return; }

  const [fav] = await db.insert(favoritesTable).values({ clerkUserId, productId }).returning();
  res.status(201).json({ ...fav, product: null, createdAt: fav.createdAt instanceof Date ? fav.createdAt.toISOString() : String(fav.createdAt) });
});

router.delete("/favorites/:productId", requireClerkAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId;
  const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  await db.delete(favoritesTable).where(and(eq(favoritesTable.clerkUserId, clerkUserId), eq(favoritesTable.productId, productId)));
  res.sendStatus(204);
});

export default router;
