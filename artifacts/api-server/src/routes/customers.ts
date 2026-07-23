import { Router, type IRouter } from "express";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db, ordersTable, pool, profilesTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";
import { requireClerkAuth } from "../lib/clerkAuth";

const router: IRouter = Router();

const serializeProfile = (profile: any) => ({
  ...profile,
  createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : String(profile.createdAt),
  updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : String(profile.updatedAt),
});

router.get("/customers/profile", requireClerkAuth, async (req, res): Promise<void> => {
  const userId = (req as any).clerkUserId;
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.clerkUserId, userId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  res.json(serializeProfile(profile));
});

router.put("/customers/profile", requireClerkAuth, async (req, res): Promise<void> => {
  const userId = (req as any).clerkUserId;
  const { firstName, lastName, phone, city, country } = req.body;
  const update = Object.fromEntries(Object.entries({ firstName, lastName, phone, city, country }).filter(([, value]) => value !== undefined));
  const [profile] = await db.update(profilesTable).set(update).where(eq(profilesTable.clerkUserId, userId)).returning();
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  res.json(serializeProfile(profile));
});

router.post("/customers/sync", requireClerkAuth, async (req, res): Promise<void> => {
  const userId = (req as any).clerkUserId;
  const { firstName, lastName, email } = req.body;
  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.clerkUserId, userId));
  if (existing) {
    const [updated] = await db.update(profilesTable).set({ firstName, lastName, email }).where(eq(profilesTable.clerkUserId, userId)).returning();
    res.json(serializeProfile(updated));
    return;
  }
  const [profile] = await db.insert(profilesTable).values({ clerkUserId: userId, firstName, lastName, email }).returning();
  res.json(serializeProfile(profile));
});

const customerSelect = `
  select
    u.id::text as id,
    u.id::text as "clerkUserId",
    u.email,
    coalesce(p.first_name, u.raw_user_meta_data->>'first_name', split_part(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1), '') as "firstName",
    coalesce(p.last_name, u.raw_user_meta_data->>'last_name', nullif(regexp_replace(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), '^\\S+\\s*', ''), ''), '') as "lastName",
    coalesce(p.phone, u.phone, u.raw_user_meta_data->>'phone', u.raw_user_meta_data#>>'{checkout_profile,phone}') as phone,
    coalesce(p.city, u.raw_user_meta_data#>>'{checkout_profile,city}') as city,
    coalesce(p.country, u.raw_user_meta_data#>>'{checkout_profile,country}') as country,
    u.created_at as "createdAt",
    u.last_sign_in_at as "lastSignInAt",
    case when u.banned_until is not null and u.banned_until > now() then 'banned' else 'active' end as status,
    coalesce(stats.order_count, 0)::int as "orderCount",
    coalesce(stats.total_spent, 0)::numeric as "totalSpent"
  from auth.users u
  left join profiles p on p.clerk_user_id = u.id::text
  left join lateral (
    select count(*) as order_count, coalesce(sum(o.total), 0) as total_spent
    from orders o
    where o.clerk_user_id = u.id::text or (o.customer_email is not null and lower(o.customer_email) = lower(u.email))
  ) stats on true
`;

router.get("/admin/customers", requireAdmin, async (req, res): Promise<void> => {
  const { page = "1", limit = "20", search = "" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;
  const normalizedSearch = search.trim();
  const whereSql = normalizedSearch
    ? " where u.email ilike $1 or coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') ilike $1"
    : "";
  const baseParams = normalizedSearch ? [`%${normalizedSearch}%`] : [];
  const listParams = [...baseParams, limitNum, offset];
  const limitPosition = baseParams.length + 1;
  const offsetPosition = baseParams.length + 2;

  const [customersResult, countResult] = await Promise.all([
    pool.query(`${customerSelect}${whereSql} order by u.created_at desc limit $${limitPosition} offset $${offsetPosition}`, listParams),
    pool.query(`select count(*)::int as count from auth.users u${whereSql}`, baseParams),
  ]);
  const total = Number(countResult.rows[0]?.count ?? 0);
  res.json({
    items: customersResult.rows.map((customer) => ({ ...customer, totalSpent: Number(customer.totalSpent ?? 0) })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get("/admin/customers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const customerResult = await pool.query(`${customerSelect} where u.id = $1::uuid`, [id]);
  const customer = customerResult.rows[0];
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }

  const orders = await db.select().from(ordersTable).where(or(eq(ordersTable.clerkUserId, id), ilike(ordersTable.customerEmail, customer.email))).orderBy(desc(ordersTable.createdAt));
  res.json({
    profile: { ...customer, totalSpent: Number(customer.totalSpent ?? 0) },
    orders: orders.map((order) => ({
      ...order,
      shippingFee: Number(order.shippingFee),
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })),
  });
});

export default router;
