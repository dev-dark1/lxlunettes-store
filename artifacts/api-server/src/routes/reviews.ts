import { Router, type IRouter } from "express";
import { eq, and, desc, sql, avg, count } from "drizzle-orm";
import { db, reviewsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const { productId, status, limit = "20" } = req.query as Record<string, string>;
  const limitNum = Math.min(100, parseInt(limit, 10));

  const conditions = [];
  // Public: only approved, Admin: any status
  if (status) {
    conditions.push(eq(reviewsTable.status, status));
  } else {
    conditions.push(eq(reviewsTable.status, "approved"));
  }
  if (productId) conditions.push(eq(reviewsTable.productId, productId));

  const reviews = await db.select().from(reviewsTable)
    .where(and(...conditions))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limitNum);

  res.json(reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  })));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const { productId, clerkUserId, customerName, rating, comment, photoUrl } = req.body;
  const [review] = await db.insert(reviewsTable).values({
    productId: productId ?? null,
    clerkUserId: clerkUserId ?? null,
    customerName,
    rating,
    comment,
    photoUrl: photoUrl ?? null,
    status: "pending",
  }).returning();
  res.status(201).json({ ...review, createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : String(review.createdAt) });
});

router.patch("/reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status, isFeatured } = req.body;
  const update: any = {};
  if (status !== undefined) update.status = status;
  if (isFeatured !== undefined) update.isFeatured = isFeatured;
  const [review] = await db.update(reviewsTable).set(update).where(eq(reviewsTable.id, id)).returning();
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json({ ...review, createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : String(review.createdAt) });
});

router.delete("/reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

router.get("/reviews/stats", async (_req, res): Promise<void> => {
  const approved = await db.select({
    rating: reviewsTable.rating,
  }).from(reviewsTable).where(eq(reviewsTable.status, "approved"));

  const total = approved.length;
  const avgRating = total > 0 ? approved.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of approved) {
    const k = String(Math.min(5, Math.max(1, r.rating)));
    dist[k] = (dist[k] ?? 0) + 1;
  }

  res.json({ averageRating: parseFloat(avgRating.toFixed(1)), totalReviews: total, ratingDistribution: dist });
});

export default router;
