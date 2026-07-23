import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, productsTable, ordersTable, orderItemsTable, categoriesTable, pool } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

// GET /admin/dashboard/stats
router.get("/admin/dashboard/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [
    productStats,
    orderStats,
    customerCount,
    revenueResult,
    categoryBreakdown,
  ] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where status = 'active')`,
      outOfStock: sql<number>`count(*) filter (where stock = 0)`,
      lowStock: sql<number>`count(*) filter (where stock > 0 and stock <= stock_alert_threshold)`,
    }).from(productsTable).where(sql`deleted_at is null`),
    db.select({
      total: sql<number>`count(*)`,
      new: sql<number>`count(*) filter (where status = 'new')`,
      delivered: sql<number>`count(*) filter (where status = 'delivered')`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
    }).from(ordersTable),
    pool.query("select count(*)::int as count from auth.users"),
    db.select({ revenue: sql<number>`coalesce(sum(total), 0)` }).from(ordersTable)
      .where(sql`status not in ('cancelled', 'refunded')`),
    db.select({
      category: categoriesTable.name,
      count: sql<number>`count(${productsTable.id})`,
    }).from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(sql`${productsTable.deletedAt} is null`)
      .groupBy(categoriesTable.name),
  ]);

  const ps = productStats[0];
  const os = orderStats[0];
  res.json({
    products: {
      total: Number(ps?.total ?? 0),
      active: Number(ps?.active ?? 0),
      outOfStock: Number(ps?.outOfStock ?? 0),
      lowStock: Number(ps?.lowStock ?? 0),
    },
    orders: {
      total: Number(os?.total ?? 0),
      new: Number(os?.new ?? 0),
      delivered: Number(os?.delivered ?? 0),
      cancelled: Number(os?.cancelled ?? 0),
    },
    customers: Number(customerCount.rows[0]?.count ?? 0),
    revenue: { estimated: parseFloat(String(revenueResult[0]?.revenue ?? 0)) },
    categoryBreakdown: categoryBreakdown.map((cb) => ({
      category: cb.category ?? "Sans catégorie",
      count: Number(cb.count),
    })),
  });
});

// GET /admin/dashboard/recent-orders
router.get("/admin/dashboard/recent-orders", requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(50, parseInt(String(req.query.limit ?? "10"), 10));
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(limit);
  const orderIds = orders.map((o) => o.id);
  const allItems = orderIds.length > 0
    ? await db.select().from(orderItemsTable).where(sql`order_id = ANY(${sql.raw(`ARRAY['${orderIds.join("','")}']::uuid[]`)})`)
    : [];
  const itemsByOrder: Record<string, any[]> = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }
  res.json(orders.map((o) => ({
    ...o,
    shippingFee: parseFloat(String(o.shippingFee)),
    subtotal: parseFloat(String(o.subtotal)),
    total: parseFloat(String(o.total)),
    items: (itemsByOrder[o.id] ?? []).map((i) => ({
      ...i,
      unitPrice: parseFloat(String(i.unitPrice)),
      totalPrice: parseFloat(String(i.totalPrice)),
      createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : String(i.createdAt),
    })),
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
  })));
});

// GET /admin/dashboard/top-products
router.get("/admin/dashboard/top-products", requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(20, parseInt(String(req.query.limit ?? "5"), 10));
  const topProducts = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      totalOrdered: sql<number>`sum(${orderItemsTable.quantity})`,
      revenue: sql<number>`sum(${orderItemsTable.totalPrice})`,
    })
    .from(orderItemsTable)
    .groupBy(orderItemsTable.productId, orderItemsTable.productName)
    .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
    .limit(limit);

  res.json(topProducts.map((tp) => ({
    productId: tp.productId,
    productName: tp.productName,
    productImage: null,
    totalOrdered: Number(tp.totalOrdered),
    revenue: parseFloat(String(tp.revenue)),
  })));
});

// GET /admin/dashboard/orders-chart
router.get("/admin/dashboard/orders-chart", requireAdmin, async (_req, res): Promise<void> => {
  const chart = await db
    .select({
      date: sql<string>`date_trunc('day', created_at)::date::text`,
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(total), 0)`,
    })
    .from(ordersTable)
    .where(sql`created_at >= now() - interval '30 days'`)
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  res.json(chart.map((row) => ({
    date: row.date,
    orders: Number(row.orders),
    revenue: parseFloat(String(row.revenue)),
  })));
});

// GET /admin/system/supabase-health
router.get("/admin/system/supabase-health", requireAdmin, async (_req, res): Promise<void> => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const checkedAt = new Date().toISOString();

  if (!supabaseUrl || !supabaseKey) {
    res.json({
      connected: false,
      latencyMs: null,
      dbStatus: "Non configuré",
      storageStatus: "Non configuré",
      tablesChecked: 0,
      error: "Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY non configurées",
      checkedAt,
    });
    return;
  }

  const start = Date.now();
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from("products").select("id").limit(1);
    const latencyMs = Date.now() - start;
    if (error) throw error;

    const { error: storageError } = await supabase.storage.listBuckets();

    res.json({
      connected: true,
      latencyMs,
      dbStatus: "Connecté",
      storageStatus: storageError ? "Erreur" : "Connecté",
      tablesChecked: 1,
      error: null,
      checkedAt,
    });
  } catch (err: any) {
    res.json({
      connected: false,
      latencyMs: Date.now() - start,
      dbStatus: "Erreur de connexion",
      storageStatus: "Inconnu",
      tablesChecked: 0,
      error: "Impossible de se connecter à Supabase",
      checkedAt,
    });
  }
});

export default router;
