import { Router, type IRouter } from "express";
import { eq, like, and, gte, lte, sql, inArray, isNull, asc, desc } from "drizzle-orm";
import { db, productsTable, productImagesTable, brandsTable, categoriesTable, promotionsTable } from "@workspace/db";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

function buildProductQuery(params: Record<string, any>) {
  const conditions = [isNull(productsTable.deletedAt)];

  if (params.status) {
    conditions.push(eq(productsTable.status, params.status));
  } else {
    // Default: only active for public
    if (!params._adminMode) {
      conditions.push(eq(productsTable.status, "active"));
    }
  }
  if (params.search) {
    conditions.push(like(productsTable.name, `%${params.search}%`));
  }
  if (params.categoryId) {
    conditions.push(eq(productsTable.categoryId, params.categoryId));
  }
  if (params.gender) {
    conditions.push(eq(productsTable.gender, params.gender));
  }
  if (params.brandId) {
    conditions.push(eq(productsTable.brandId, params.brandId));
  }
  if (params.minPrice) {
    conditions.push(gte(productsTable.price, String(params.minPrice)));
  }
  if (params.maxPrice) {
    conditions.push(lte(productsTable.price, String(params.maxPrice)));
  }
  if (params.color) {
    conditions.push(eq(productsTable.color, params.color));
  }
  if (params.shape) {
    conditions.push(eq(productsTable.shape, params.shape));
  }
  if (params.inStock === "true" || params.inStock === true) {
    conditions.push(gte(productsTable.stock, 1));
  }
  if (params.isFeatured === "true" || params.isFeatured === true) {
    conditions.push(eq(productsTable.isFeatured, true));
  }
  if (params.isNew === "true" || params.isNew === true) {
    conditions.push(eq(productsTable.isNew, true));
  }

  return and(...conditions);
}

async function enrichProducts(products: any[]) {
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const images = await db
    .select()
    .from(productImagesTable)
    .where(inArray(productImagesTable.productId, productIds))
    .orderBy(asc(productImagesTable.sortOrder));

  const brands = await db.select().from(brandsTable);
  const categories = await db.select().from(categoriesTable);
  const activePromotions = await db.select().from(promotionsTable).where(eq(promotionsTable.isActive, true));

  const imagesByProduct: Record<string, any[]> = {};
  for (const img of images) {
    if (!imagesByProduct[img.productId]) imagesByProduct[img.productId] = [];
    imagesByProduct[img.productId].push(img);
  }

  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return products.map((p) => {
    const imgs = imagesByProduct[p.id] ?? [];
    const primaryImg = p.primaryImage ?? imgs.find((i) => i.isPrimary)?.url ?? imgs[0]?.url ?? null;
    const brand = brandMap[p.brandId];
    const category = catMap[p.categoryId];

    // Find applicable promotion
    const promotion = activePromotions.find(
      (pr) =>
        pr.appliesTo === "all" ||
        (pr.appliesTo === "product" && pr.targetId === p.id) ||
        (pr.appliesTo === "brand" && pr.targetId === p.brandId) ||
        (pr.appliesTo === "category" && pr.targetId === p.categoryId),
    );

    let promotionPrice: number | null = null;
    let promotionLabel: string | null = null;
    if (promotion) {
      const basePrice = parseFloat(String(p.salePrice ?? p.price));
      if (promotion.discountType === "percentage") {
        promotionPrice = parseFloat((basePrice * (1 - parseFloat(String(promotion.discountValue)) / 100)).toFixed(2));
      } else {
        promotionPrice = parseFloat((basePrice - parseFloat(String(promotion.discountValue))).toFixed(2));
      }
      promotionLabel = promotion.label;
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      shortDescription: p.shortDescription,
      fullDescription: p.fullDescription,
      brand: brand?.name ?? "",
      brandId: p.brandId,
      category: category?.name ?? "",
      categoryId: p.categoryId,
      gender: p.gender,
      price: parseFloat(String(p.price)),
      salePrice: p.salePrice ? parseFloat(String(p.salePrice)) : null,
      costPrice: p.costPrice ? parseFloat(String(p.costPrice)) : null,
      stock: p.stock,
      stockAlertThreshold: p.stockAlertThreshold,
      color: p.color,
      frameMaterial: p.frameMaterial,
      shape: p.shape,
      lensType: p.lensType,
      uvProtection: p.uvProtection,
      dimensions: p.dimensions,
      galleryUrls: p.galleryUrls,
      videoUrl: p.videoUrl,
      status: p.status,
      isFeatured: p.isFeatured,
      isNew: p.isNew,
      images: imgs,
      primaryImage: primaryImg,
      promotionPrice,
      promotionLabel,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    };
  });
}

// GET /products
router.get("/products", async (req, res): Promise<void> => {
  const { page = "1", limit = "20", sortBy, ...filters } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const where = buildProductQuery(filters);

  let orderBy;
  switch (sortBy) {
    case "price_asc": orderBy = asc(productsTable.price); break;
    case "price_desc": orderBy = desc(productsTable.price); break;
    case "popular": orderBy = desc(productsTable.isFeatured); break;
    case "name": orderBy = asc(productsTable.name); break;
    default: orderBy = desc(productsTable.createdAt); break;
  }

  const [products, countResult] = await Promise.all([
    db.select().from(productsTable).where(where).orderBy(orderBy).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(productsTable).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const enriched = await enrichProducts(products);

  res.json({
    items: enriched,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// GET /products/featured
router.get("/products/featured", async (req, res): Promise<void> => {
  const limit = Math.min(20, parseInt(String(req.query.limit ?? "8"), 10));
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.isFeatured, true), eq(productsTable.status, "active"), isNull(productsTable.deletedAt)))
    .orderBy(desc(productsTable.createdAt))
    .limit(limit);
  res.json(await enrichProducts(products));
});

// GET /products/new-arrivals
router.get("/products/new-arrivals", async (req, res): Promise<void> => {
  const limit = Math.min(20, parseInt(String(req.query.limit ?? "8"), 10));
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.isNew, true), eq(productsTable.status, "active"), isNull(productsTable.deletedAt)))
    .orderBy(desc(productsTable.createdAt))
    .limit(limit);
  res.json(await enrichProducts(products));
});

// GET /products/slug/:slug
router.get("/products/slug/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [product] = await db.select().from(productsTable).where(eq(productsTable.slug, slug));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const [enriched] = await enrichProducts([product]);
  res.json(enriched);
});

// GET /products/:id
router.get("/products/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const [enriched] = await enrichProducts([product]);
  res.json(enriched);
});

// GET /products/:id/similar
router.get("/products/:id/similar", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) { res.json([]); return; }
  const similar = await db
    .select()
    .from(productsTable)
    .where(and(
      eq(productsTable.categoryId, product.categoryId),
      eq(productsTable.status, "active"),
      isNull(productsTable.deletedAt),
      sql`${productsTable.id} != ${id}`,
    ))
    .limit(4);
  res.json(await enrichProducts(similar));
});

// POST /products (admin)
router.post("/products", requireAdmin, async (req, res): Promise<void> => {
  const data = req.body;
  const [product] = await db.insert(productsTable).values({
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    shortDescription: data.shortDescription,
    fullDescription: data.fullDescription ?? null,
    brandId: data.brandId,
    categoryId: data.categoryId,
    gender: data.gender ?? "unisexe",
    price: String(data.price),
    salePrice: data.salePrice != null ? String(data.salePrice) : null,
    costPrice: data.costPrice != null ? String(data.costPrice) : null,
    stock: data.stock ?? 0,
    stockAlertThreshold: data.stockAlertThreshold ?? 5,
    color: data.color ?? null,
    frameMaterial: data.frameMaterial ?? null,
    shape: data.shape ?? null,
    lensType: data.lensType ?? null,
    uvProtection: data.uvProtection ?? null,
    dimensions: data.dimensions ?? null,
    primaryImage: data.primaryImage ?? null,
    galleryUrls: data.galleryUrls ?? null,
    videoUrl: data.videoUrl ?? null,
    status: data.status ?? "draft",
    isFeatured: data.isFeatured ?? false,
    isNew: data.isNew ?? false,
  } as any).returning();
  const [enriched] = await enrichProducts([product]);
  res.status(201).json(enriched);
});

// PUT /products/:id (admin)
router.put("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const data = req.body;
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
  if (data.fullDescription !== undefined) updateData.fullDescription = data.fullDescription;
  if (data.brandId !== undefined) updateData.brandId = data.brandId;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.price !== undefined) updateData.price = String(data.price);
  if (data.salePrice !== undefined) updateData.salePrice = data.salePrice != null ? String(data.salePrice) : null;
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice != null ? String(data.costPrice) : null;
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.stockAlertThreshold !== undefined) updateData.stockAlertThreshold = data.stockAlertThreshold;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.frameMaterial !== undefined) updateData.frameMaterial = data.frameMaterial;
  if (data.shape !== undefined) updateData.shape = data.shape;
  if (data.lensType !== undefined) updateData.lensType = data.lensType;
  if (data.uvProtection !== undefined) updateData.uvProtection = data.uvProtection;
  if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;
  if (data.primaryImage !== undefined) updateData.primaryImage = data.primaryImage;
  if (data.galleryUrls !== undefined) updateData.galleryUrls = data.galleryUrls;
  if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
  if (data.isNew !== undefined) updateData.isNew = data.isNew;

  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  const [enriched] = await enrichProducts([product]);
  res.json(enriched);
});

// DELETE /products/:id (admin)
router.delete("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.update(productsTable).set({ deletedAt: new Date() }).where(eq(productsTable.id, id));
  res.sendStatus(204);
});

// POST /products/:id/duplicate (admin)
router.post("/products/:id/duplicate", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [original] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!original) { res.status(404).json({ error: "Product not found" }); return; }
  const suffix = Date.now().toString(36);
  const [duplicate] = await db.insert(productsTable).values({
    ...original,
    id: undefined as any,
    name: `${original.name} (copie)`,
    slug: `${original.slug}-${suffix}`,
    sku: `${original.sku}-${suffix}`,
    status: "draft",
    createdAt: undefined as any,
    updatedAt: undefined as any,
    deletedAt: null,
  }).returning();
  const [enriched] = await enrichProducts([duplicate]);
  res.status(201).json(enriched);
});

// POST /products/:id/images (admin)
router.post("/products/:id/images", requireAdmin, async (req, res): Promise<void> => {
  const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { url, isPrimary = false, sortOrder = 0, alt = null } = req.body;
  if (isPrimary) {
    await db.update(productImagesTable).set({ isPrimary: false }).where(eq(productImagesTable.productId, productId));
  }
  const [image] = await db.insert(productImagesTable).values({ productId, url, isPrimary, sortOrder, alt }).returning();
  res.status(201).json(image);
});

// DELETE /products/:id/images/:imageId (admin)
router.delete("/products/:id/images/:imageId", requireAdmin, async (req, res): Promise<void> => {
  const imageId = Array.isArray(req.params.imageId) ? req.params.imageId[0] : req.params.imageId;
  await db.delete(productImagesTable).where(eq(productImagesTable.id, imageId));
  res.sendStatus(204);
});

export default router;
