/**
 * Database seed script — run once to populate sample data
 * Usage: pnpm --filter @workspace/api-server run seed
 */

import bcrypt from "bcryptjs";
import { db, brandsTable, categoriesTable, productsTable, productImagesTable, adminUsersTable, reviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding LXLunettes database...");

  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@lxlunettes.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@LX2024!";

  const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, adminEmail));
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(adminUsersTable).values({ email: adminEmail, passwordHash, isActive: true });
    console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log("ℹ️ Admin already exists, skipping.");
  }

  // --- Brands ---
  const brandData = [
    { name: "Gucci", slug: "gucci", description: "Maison de luxe italienne fondée en 1921.", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Gucci_logo.svg/200px-Gucci_logo.svg.png", isActive: true },
    { name: "Prada", slug: "prada", description: "Marque de luxe milanaise synonyme d'élégance intemporelle.", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Prada-logo.svg/200px-Prada-logo.svg.png", isActive: true },
    { name: "Céline", slug: "celine", description: "Maison parisienne fondée en 1945, l'essence du chic français.", logoUrl: null, isActive: true },
    { name: "Ray-Ban", slug: "ray-ban", description: "L'icône américaine des lunettes de soleil depuis 1937.", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Ray-Ban-Logo.svg/200px-Ray-Ban-Logo.svg.png", isActive: true },
    { name: "Dior", slug: "dior", description: "L'élégance française à son apogée depuis 1946.", logoUrl: null, isActive: true },
    { name: "Versace", slug: "versace", description: "La maison italienne de la sensualité et du prestige.", logoUrl: null, isActive: true },
  ];

  const brands: Record<string, string> = {};
  for (const b of brandData) {
    const [brand] = await db.insert(brandsTable).values(b).onConflictDoNothing().returning();
    if (brand) brands[b.slug] = brand.id;
    else {
      const [existing] = await db.select().from(brandsTable).where(eq(brandsTable.slug, b.slug));
      if (existing) brands[b.slug] = existing.id;
    }
  }
  console.log(`✅ ${Object.keys(brands).length} marques créées`);

  // --- Categories ---
  const categoryData = [
    { name: "Hommes", slug: "hommes", type: "homme", description: "Collection lunettes de soleil pour hommes" },
    { name: "Femmes", slug: "femmes", type: "femme", description: "Collection lunettes de soleil pour femmes" },
    { name: "Unisexe", slug: "unisexe", type: "unisexe", description: "Collection lunettes de soleil unisexe" },
    { name: "Sport", slug: "sport", type: "unisexe", description: "Lunettes de sport et outdoor" },
    { name: "Classique", slug: "classique", type: "unisexe", description: "Styles intemporels et classiques" },
  ];

  const cats: Record<string, string> = {};
  for (const c of categoryData) {
    const [cat] = await db.insert(categoriesTable).values(c).onConflictDoNothing().returning();
    if (cat) cats[c.slug] = cat.id;
    else {
      const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, c.slug));
      if (existing) cats[c.slug] = existing.id;
    }
  }
  console.log(`✅ ${Object.keys(cats).length} catégories créées`);

  // --- Products ---
  const productData = [
    {
      name: "Gucci GG0396S",
      slug: "gucci-gg0396s",
      sku: "GUC-GG0396S-001",
      shortDescription: "Monture cat-eye dorée, verres dégradés fumés. Ultime expression de la féminité selon Gucci.",
      fullDescription: "Les lunettes GG0396S de Gucci incarnent l'esprit de la maison florentine. La monture cat-eye en métal doré est ornée d'un détail de mors de cheval sur les branches, signature iconique de la maison. Les verres dégradés fumés offrent une protection optimale tout en sublimant le regard.",
      brandSlug: "gucci",
      categorySlug: "femmes",
      price: "3200",
      salePrice: null,
      stock: 12,
      color: "Or",
      frameMaterial: "Métal",
      shape: "Cat-eye",
      lensType: "Dégradé",
      uvProtection: "UV400",
      status: "active",
      isFeatured: true,
      isNew: true,
      images: [
        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1509695507497-903c140c43b0?w=800&h=600&fit=crop",
      ],
    },
    {
      name: "Prada PR 17WS",
      slug: "prada-pr-17ws",
      sku: "PRA-PR17WS-001",
      shortDescription: "Lunettes surdimensionnées en acétate noir. Le summum du minimalisme sophistiqué de Prada.",
      fullDescription: "Les lunettes PR 17WS de Prada représentent la vision contemporaine de la maison milanaise. La monture oversize en acétate noir pur offre une présence affirmée, tandis que les verres gris foncé garantissent une protection maximale. Les branches ornées du logo Prada estampillé complètent ce regard d'une sophistication absolue.",
      brandSlug: "prada",
      categorySlug: "femmes",
      price: "2800",
      salePrice: "2450",
      stock: 8,
      color: "Noir",
      frameMaterial: "Acétate",
      shape: "Oversize",
      lensType: "Uniforme",
      uvProtection: "UV400",
      status: "active",
      isFeatured: true,
      isNew: false,
      images: [
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1584486483122-af7d5cf41d71?w=800&h=600&fit=crop",
      ],
    },
    {
      name: "Ray-Ban Aviator Classic",
      slug: "ray-ban-aviator-classic",
      sku: "RB-3025-001",
      shortDescription: "L'aviateur originel. Monture métal dorée, verres verts G-15 emblématiques.",
      fullDescription: "L'Aviator Classic de Ray-Ban est né en 1937 pour les pilotes de l'armée américaine. Depuis, il est devenu l'une des lunettes les plus reconnaissables au monde. La monture en métal léger épouse parfaitement le visage, tandis que les verres G-15 réduisent la fatigue oculaire tout en rendant les couleurs plus nettes.",
      brandSlug: "ray-ban",
      categorySlug: "unisexe",
      price: "1450",
      salePrice: null,
      stock: 25,
      color: "Or",
      frameMaterial: "Métal",
      shape: "Aviateur",
      lensType: "G-15",
      uvProtection: "UV400",
      status: "active",
      isFeatured: false,
      isNew: false,
      images: [
        "https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1497801727980-1a65b3d6428e?w=800&h=600&fit=crop",
      ],
    },
    {
      name: "Céline CL40195U",
      slug: "celine-cl40195u",
      sku: "CEL-CL40195U-001",
      shortDescription: "Monture rectangulaire en acétate havane. L'élégance parisienne dans toute sa pureté.",
      fullDescription: "Les lunettes CL40195U de Céline incarnent l'esthétique épurée et sophistiquée définie par Hedi Slimane pour la maison parisienne. La monture rectangulaire en acétate havane tortoise est à la fois structurée et raffinée. Les verres fumés naturels complètent ce regard d'une élégance sans effort.",
      brandSlug: "celine",
      categorySlug: "femmes",
      price: "2650",
      salePrice: null,
      stock: 6,
      color: "Havane",
      frameMaterial: "Acétate",
      shape: "Rectangulaire",
      lensType: "Fumé",
      uvProtection: "UV400",
      status: "active",
      isFeatured: true,
      isNew: true,
      images: [
        "https://images.unsplash.com/photo-1577744486770-020ab432da65?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1590750390369-60f4a55d2b8e?w=800&h=600&fit=crop",
      ],
    },
    {
      name: "Dior DiorSignature M1U",
      slug: "dior-signature-m1u",
      sku: "DIO-SIGM1U-001",
      shortDescription: "Le nouveau classique Dior. Monture ronde en métal rose gold, verres miroir.",
      fullDescription: "La DiorSignature M1U capture l'essence contemporaine de la maison Dior. La monture ronde délicate en métal rose gold est complétée par les verres miroir qui reflètent la lumière avec élégance. La signature Dior sur les branches rappelle la provenance haute couture de cette pièce iconique.",
      brandSlug: "dior",
      categorySlug: "femmes",
      price: "3500",
      salePrice: "2995",
      stock: 4,
      color: "Rose Gold",
      frameMaterial: "Métal",
      shape: "Ronde",
      lensType: "Miroir",
      uvProtection: "UV400",
      status: "active",
      isFeatured: true,
      isNew: true,
      images: [
        "https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1592495989226-03f88104f8cc?w=800&h=600&fit=crop",
      ],
    },
    {
      name: "Versace VE2199",
      slug: "versace-ve2199",
      sku: "VER-VE2199-001",
      shortDescription: "La Meduse Versace sur branches dorées. Audace et prestige à l'état pur.",
      fullDescription: "Les lunettes VE2199 de Versace sont l'expression ultime du style baroque de la maison. La monture oversize en acétate noir est sublimée par les branches dorées ornées de la Méduse emblématique de Versace. Les verres gris foncé créent un contraste saisissant avec l'or des branches.",
      brandSlug: "versace",
      categorySlug: "hommes",
      price: "2900",
      salePrice: null,
      stock: 9,
      color: "Noir/Or",
      frameMaterial: "Acétate",
      shape: "Rectangulaire",
      lensType: "Fumé",
      uvProtection: "UV400",
      status: "active",
      isFeatured: false,
      isNew: false,
      images: [
        "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1602810319428-019690571b5b?w=800&h=600&fit=crop",
      ],
    },
    {
      name: "Ray-Ban Wayfarer Original",
      slug: "ray-ban-wayfarer-original",
      sku: "RB-2140-001",
      shortDescription: "Le Wayfarer — l'icône absolue depuis 1952. Monture acétate noir, verres verts G-15.",
      fullDescription: "Aucune lunette n'a eu autant d'influence culturelle que le Wayfarer de Ray-Ban. Introduit en 1952, il a été porté par les plus grandes stars du cinéma et de la musique. La monture en acétate robuste et les verres G-15 en font un choix intemporel qui ne se démode jamais.",
      brandSlug: "ray-ban",
      categorySlug: "unisexe",
      price: "1280",
      salePrice: null,
      stock: 30,
      color: "Noir",
      frameMaterial: "Acétate",
      shape: "Rectangulaire",
      lensType: "G-15",
      uvProtection: "UV400",
      status: "active",
      isFeatured: false,
      isNew: false,
      images: [
        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1509695507497-903c140c43b0?w=800&h=600&fit=crop",
      ],
    },
    {
      name: "Gucci GG1160S",
      slug: "gucci-gg1160s",
      sku: "GUC-GG1160S-001",
      shortDescription: "Monture papillon dorée avec détails en cristaux. Gucci Aria — l'héritage revisité.",
      fullDescription: "Les lunettes GG1160S font partie de la collection Gucci Aria d'Alessandro Michele, une lettre d'amour à l'héritage de la maison. La monture papillon en métal doré est ornée de cristaux Swarovski discrets sur les branches. Les verres roses dégradés ajoutent une touche de romantisme.",
      brandSlug: "gucci",
      categorySlug: "femmes",
      price: "4200",
      salePrice: null,
      stock: 3,
      color: "Or/Cristal",
      frameMaterial: "Métal",
      shape: "Papillon",
      lensType: "Dégradé Rose",
      uvProtection: "UV400",
      status: "active",
      isFeatured: true,
      isNew: true,
      images: [
        "https://images.unsplash.com/photo-1584486483122-af7d5cf41d71?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=600&fit=crop",
      ],
    },
  ];

  for (const p of productData) {
    const brandId = brands[p.brandSlug];
    const categoryId = cats[p.categorySlug];
    if (!brandId || !categoryId) { console.warn(`⚠️ Skipping ${p.name} — missing brand or category`); continue; }

    const existingSlug = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.slug, p.slug));
    if (existingSlug.length > 0) { console.log(`ℹ️ Product '${p.name}' exists, skipping.`); continue; }

    const [product] = await db.insert(productsTable).values({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      shortDescription: p.shortDescription,
      fullDescription: p.fullDescription,
      brandId,
      categoryId,
      price: p.price,
      salePrice: p.salePrice,
      stock: p.stock,
      color: p.color,
      frameMaterial: p.frameMaterial,
      shape: p.shape,
      lensType: p.lensType,
      uvProtection: p.uvProtection,
      status: p.status,
      isFeatured: p.isFeatured,
      isNew: p.isNew,
    }).returning();

    if (product && p.images) {
      for (let i = 0; i < p.images.length; i++) {
        await db.insert(productImagesTable).values({
          productId: product.id,
          url: p.images[i],
          isPrimary: i === 0,
          sortOrder: i,
        });
      }
    }
    console.log(`  ✅ ${p.name}`);
  }
  console.log(`✅ Products seeded`);

  // --- Sample reviews ---
  const reviewData = [
    { customerName: "Amina B.", rating: 5, comment: "Service exceptionnel, livraison rapide. Mes lunettes Gucci sont magnifiques, exactement comme sur les photos. Je recommande vivement LXLunettes !", status: "approved" as const, isFeatured: true },
    { customerName: "Youssef K.", rating: 5, comment: "Authenticité garantie, j'ai vérifié auprès de la boutique officielle. Très bonne communication par WhatsApp, l'équipe est réactive et professionnelle.", status: "approved" as const, isFeatured: true },
    { customerName: "Salma A.", rating: 4, comment: "Superbe collection, des marques de luxe à des prix compétitifs. La communication est excellente. Livraison en 3 jours, impeccable.", status: "approved" as const, isFeatured: false },
    { customerName: "Mehdi R.", rating: 5, comment: "Ma troisième commande chez LXLunettes ! Toujours aussi satisfait. Les lunettes Ray-Ban Aviator sont parfaites, emballage soigné.", status: "approved" as const, isFeatured: true },
    { customerName: "Laila M.", rating: 5, comment: "J'ai commandé des Prada et je suis ravie. La qualité est irréprochable et le SAV est très réactif sur WhatsApp. LXLunettes, c'est ma boutique préférée !", status: "approved" as const, isFeatured: false },
  ];

  for (const r of reviewData) {
    await db.insert(reviewsTable).values(r);
  }
  console.log(`✅ ${reviewData.length} avis créés`);

  console.log("\n🎉 Seed terminé avec succès !");
  console.log(`\n🔐 Identifiants admin :`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Mot de passe: ${adminPassword}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
