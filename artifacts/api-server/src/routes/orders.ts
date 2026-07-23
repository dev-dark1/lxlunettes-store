import { Router, type IRouter } from "express";
import { eq, like, and, desc, sql, inArray, or, ilike } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { db, ordersTable, orderItemsTable, productsTable, stockMovementsTable, settingsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { optionalClerkAuth } from "../lib/clerkAuth";
import { generateWhatsAppMessage } from "../lib/whatsapp";

const router: IRouter = Router();

function serializeOrder(order: any, items: any[]) {
  return {
    ...order,
    shippingFee: parseFloat(String(order.shippingFee)),
    subtotal: parseFloat(String(order.subtotal)),
    total: parseFloat(String(order.total)),
    items: items.map((i) => ({
      ...i,
      unitPrice: parseFloat(String(i.unitPrice)),
      totalPrice: parseFloat(String(i.totalPrice)),
      createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : String(i.createdAt),
    })),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : String(order.updatedAt),
  };
}

async function enrichOrderItems(items: any[]) {
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))] as string[];
  if (productIds.length === 0) return items;
  const products = await db.select({ id: productsTable.id, primaryImage: sql<string | null>`primary_image` }).from(productsTable).where(inArray(productsTable.id, productIds));
  const imageByProduct = Object.fromEntries(products.map((product) => [product.id, product.primaryImage]));
  return items.map((item) => ({ ...item, productImage: item.productImage ?? imageByProduct[item.productId] ?? null }));
}

async function getOrderWithItems(orderId: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return serializeOrder(order, await enrichOrderItems(items));
}

// Human-readable and collision-resistant; safe under concurrent checkouts.
function generateOrderNumber(): string {
  const now = new Date();
  const day = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `LXL-${day}-${suffix}`;
}

async function getVerifiedSupabaseUser(req: any): Promise<{ id: string; email: string | null } | null> {
  const header = req.headers.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_PUBLIC;
  if (!token || !supabaseUrl || !supabaseKey) return null;

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : { id: data.user.id, email: data.user.email ?? null };
}

async function getWhatsAppConfig() {
  const rows = await db.select().from(settingsTable).where(inArray(settingsTable.key, ["WHATSAPP_NUMBER", "WHATSAPP_MSG"]));
  const settings = Object.fromEntries(rows.map((setting) => [setting.key, setting.value]));
  const rawNumber = settings.WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || "212779524872";
  const digits = rawNumber.replace(/\D/g, "");
  return {
    number: digits.startsWith("0") ? `212${digits.slice(1)}` : digits,
    intro: settings.WHATSAPP_MSG?.trim() ?? "",
  };
}

function buildWhatsAppUrl(order: any, items: any[], config: { number: string; intro: string }) {
  const generated = generateWhatsAppMessage(order, items);
  const message = config.intro ? `${config.intro}\n\n${generated}` : generated;
  return `https://wa.me/${config.number}?text=${encodeURIComponent(message)}`;
}

// GET /orders (admin or own)
router.get("/orders", requireAdmin, async (req, res): Promise<void> => {
  const { page = "1", limit = "20", status, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (status) conditions.push(eq(ordersTable.status, status));
  if (search) conditions.push(like(ordersTable.orderNumber, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [orders, countResult] = await Promise.all([
    db.select().from(ordersTable).where(where).orderBy(desc(ordersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(where),
  ]);

  const orderIds = orders.map((o) => o.id);
  const rawItems = orderIds.length > 0
    ? await db.select().from(orderItemsTable).where(sql`order_id = ANY(${sql.raw(`ARRAY['${orderIds.join("','")}']::uuid[]`)})`)
    : [];
  const allItems = await enrichOrderItems(rawItems);

  const itemsByOrder: Record<string, any[]> = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }

  const total = Number(countResult[0]?.count ?? 0);
  const whatsappConfig = await getWhatsAppConfig();
  res.json({
    items: orders.map((o) => ({
      ...serializeOrder(o, itemsByOrder[o.id] ?? []),
      whatsappUrl: buildWhatsAppUrl(o, itemsByOrder[o.id] ?? [], whatsappConfig),
    })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// GET /orders/my (authenticated customer)
router.get("/orders/my", optionalClerkAuth, async (req, res): Promise<void> => {
  const verifiedSupabaseUser = await getVerifiedSupabaseUser(req);
  const customerUserId = (req as any).clerkUserId ?? verifiedSupabaseUser?.id;
  if (!customerUserId) { res.status(401).json({ error: "Authentication required" }); return; }
  const email = verifiedSupabaseUser?.email;
  const { page = "1", limit = "10" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const ownOrdersWhere = email
    ? or(eq(ordersTable.clerkUserId, customerUserId), ilike(ordersTable.customerEmail, email))
    : eq(ordersTable.clerkUserId, customerUserId);

  if (email) {
    await db.update(ordersTable).set({ clerkUserId: customerUserId }).where(and(sql`${ordersTable.clerkUserId} is null`, ilike(ordersTable.customerEmail, email)));
  }

  const [orders, countResult] = await Promise.all([
    db.select().from(ordersTable).where(ownOrdersWhere).orderBy(desc(ordersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(ownOrdersWhere),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const orderIds = orders.map((o) => o.id);
  const rawItems = orderIds.length > 0
    ? await db.select().from(orderItemsTable).where(sql`order_id = ANY(${sql.raw(`ARRAY['${orderIds.join("','")}']::uuid[]`)})`)
    : [];
  const allItems = await enrichOrderItems(rawItems);

  const itemsByOrder: Record<string, any[]> = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
    itemsByOrder[item.orderId].push(item);
  }

  const whatsappConfig = await getWhatsAppConfig();
  res.json({
    items: orders.map((o) => ({
      ...serializeOrder(o, itemsByOrder[o.id] ?? []),
      whatsappUrl: buildWhatsAppUrl(o, itemsByOrder[o.id] ?? [], whatsappConfig),
    })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// GET /orders/:id
router.get("/orders/:id", optionalClerkAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const order = await getOrderWithItems(id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(order);
});

// POST /orders (create order + WhatsApp)
router.post("/orders", optionalClerkAuth, async (req, res): Promise<void> => {
  const { customerName, customerPhone, customerEmail, city, country, address, customerNote, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "No items in order" });
    return;
  }
  if (![customerName, customerPhone, city, country, address].every((value) => typeof value === "string" && value.trim())) {
    res.status(400).json({ error: "Informations client incomplètes" });
    return;
  }
  if (items.some((item: any) => typeof item.productId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    res.status(400).json({ error: "Articles de commande invalides" });
    return;
  }

  try {
    const verifiedSupabaseUser = await getVerifiedSupabaseUser(req);
    const verifiedUserId = (req as any).clerkUserId ?? verifiedSupabaseUser?.id ?? null;
    const productIds = [...new Set(items.map((item: any) => item.productId))] as string[];

    const created = await db.transaction(async (tx) => {
      // Lock inventory rows until the order and stock movements are committed.
      for (const productId of productIds) {
        await tx.execute(sql`select id from ${productsTable} where ${productsTable.id} = ${productId} for update`);
      }
      const products = await tx.select().from(productsTable).where(inArray(productsTable.id, productIds));
      const productMap = Object.fromEntries(products.map((product) => [product.id, product]));

      let subtotal = 0;
      const preparedItems = items.map((item: any) => {
        const product = productMap[item.productId];
        if (!product) throw Object.assign(new Error("Un produit n'existe plus."), { status: 400 });
        if (product.stock < item.quantity) {
          throw Object.assign(new Error(`Stock insuffisant pour ${product.name}`), { status: 409 });
        }
        const unitPrice = parseFloat(String(product.salePrice ?? product.price));
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productImage: (product as any).primaryImage ?? null,
          quantity: item.quantity,
          unitPrice: String(unitPrice.toFixed(2)),
          totalPrice: String(totalPrice.toFixed(2)),
        };
      });

      const shippingFee = 0;
      const total = subtotal + shippingFee;
      const orderNumber = generateOrderNumber();
      const [order] = await tx.insert(ordersTable).values({
        orderNumber,
        clerkUserId: verifiedUserId,
        status: "new",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail?.trim() || null,
        city: city.trim(),
        country: country.trim(),
        address: address.trim(),
        customerNote: customerNote?.trim() || null,
        shippingFee: String(shippingFee),
        subtotal: String(subtotal.toFixed(2)),
        total: String(total.toFixed(2)),
      }).returning();

      const insertedItems = await tx.insert(orderItemsTable).values(
        preparedItems.map((item) => ({ ...item, orderId: order.id })),
      ).returning();

      for (const item of items) {
        await tx.update(productsTable)
          .set({ stock: sql`${productsTable.stock} - ${item.quantity}` })
          .where(eq(productsTable.id, item.productId));
        await tx.insert(stockMovementsTable).values({
          productId: item.productId,
          type: "ORDER",
          quantity: -item.quantity,
          reason: `Commande ${orderNumber}`,
          orderId: order.id,
        });
      }

      return { order, insertedItems };
    });

    const whatsappConfig = await getWhatsAppConfig();
    const whatsappUrl = buildWhatsAppUrl(created.order, created.insertedItems, whatsappConfig);

    res.status(201).json({
      order: serializeOrder(created.order, created.insertedItems),
      whatsappUrl,
    });
  } catch (error: any) {
    req.log?.error({ err: error }, "Checkout failed");
    res.status(error?.status ?? 500).json({ error: error?.message ?? "Impossible de créer la commande" });
  }
});

// PATCH /orders/:id/status (admin)
router.patch("/orders/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status, adminNote } = req.body;
  const update: any = { status };
  if (adminNote !== undefined) update.adminNote = adminNote;
  const [order] = await db.update(ordersTable).set(update).where(eq(ordersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  res.json(serializeOrder(order, items));
});

// PATCH /orders/:id/cancel (admin)
router.patch("/orders/:id/cancel", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [order] = await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  // Restore stock
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  for (const item of items) {
    await db.update(productsTable).set({ stock: sql`${productsTable.stock} + ${item.quantity}` }).where(eq(productsTable.id, item.productId));
    await db.insert(stockMovementsTable).values({
      productId: item.productId,
      type: "CANCELLATION",
      quantity: item.quantity,
      reason: `Annulation commande ${order.orderNumber}`,
      orderId: id,
    });
  }
  res.json(serializeOrder(order, items));
});

export default router;
