import { Router, type IRouter } from "express";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { db, stockMovementsTable, productsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

router.get("/stock/movements", requireAdmin, async (req, res): Promise<void> => {
  const { page = "1", limit = "20", productId, type } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (productId) conditions.push(eq(stockMovementsTable.productId, productId));
  if (type) conditions.push(eq(stockMovementsTable.type, type));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [movements, countResult] = await Promise.all([
    db.select().from(stockMovementsTable).where(where).orderBy(desc(stockMovementsTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(stockMovementsTable).where(where),
  ]);

  const productIds = [...new Set(movements.map((m) => m.productId))];
  const products = productIds.length > 0
    ? await db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable)
        .where(sql`id = ANY(${sql.raw(`ARRAY['${productIds.join("','")}']::uuid[]`)})`)
    : [];
  const productNameMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const total = Number(countResult[0]?.count ?? 0);
  res.json({
    items: movements.map((m) => ({
      ...m,
      productName: productNameMap[m.productId] ?? null,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.post("/stock/movements", requireAdmin, async (req, res): Promise<void> => {
  const { productId, type, quantity, reason, orderId } = req.body;
  const adminId = (req as any).adminId;

  // Prevent negative stock
  if (["OUT", "ORDER"].includes(type)) {
    const [product] = await db.select({ stock: productsTable.stock }).from(productsTable).where(eq(productsTable.id, productId));
    if (!product || product.stock < quantity) {
      res.status(400).json({ error: "Stock insuffisant" });
      return;
    }
  }

  const [movement] = await db.insert(stockMovementsTable).values({
    productId,
    type,
    quantity: ["OUT", "ORDER"].includes(type) ? -Math.abs(quantity) : Math.abs(quantity),
    reason,
    orderId: orderId ?? null,
    adminId,
  }).returning();

  // Update product stock
  const stockChange = ["OUT", "ORDER"].includes(type) ? -Math.abs(quantity) : Math.abs(quantity);
  await db.update(productsTable).set({ stock: sql`${productsTable.stock} + ${stockChange}` }).where(eq(productsTable.id, productId));

  res.status(201).json({ ...movement, productName: null, createdAt: movement.createdAt instanceof Date ? movement.createdAt.toISOString() : String(movement.createdAt) });
});

router.get("/stock/low-alert", requireAdmin, async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .where(sql`${productsTable.stock} <= ${productsTable.stockAlertThreshold} AND deleted_at IS NULL`);
  res.json(products);
});

export default router;
