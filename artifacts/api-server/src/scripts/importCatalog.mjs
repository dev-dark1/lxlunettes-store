import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_PUBLIC;
const bucket = process.env.VITE_SUPABASE_BUCKET || 'lxlunettes';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_PUBLIC are required.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sets = [
  {
    key: 'u1', gender: 'unisexe', count: 28,
    source: String.raw`C:\Users\Windows\Downloads\Telegram Desktop\UNISEX`,
    stamp: '2026-07-22_13-41-54',
  },
  {
    key: 'f1', gender: 'femme', count: 100,
    source: String.raw`C:\Users\Windows\Downloads\Telegram Desktop\FEMMES`,
    stamp: '2026-07-22_13-34-04',
  },
  {
    key: 'f2', gender: 'femme', count: 18,
    source: String.raw`C:\Users\Windows\Downloads\Telegram Desktop\FEMMES`,
    stamp: '2026-07-22_13-34-25',
  },
  {
    key: 'f3', gender: 'femme', count: 6,
    source: String.raw`C:\Users\Windows\Downloads\Telegram Desktop\FEMMES`,
    stamp: '2026-07-22_13-36-28',
  },
  {
    key: 'h1', gender: 'homme', count: 95,
    source: String.raw`C:\Users\Windows\Downloads\Telegram Desktop\HOMMES`,
    stamp: '2026-07-22_13-23-41',
  },
];

const range = (from, to, brand, shape = 'Carrée', material = 'Acétate') => ({ from, to, brand, shape, material });

const catalogRanges = {
  u1: [
    range(1, 2, 'CELINE', 'Géométrique', 'Métal'),
    range(3, 7, 'CARTIER', 'Rimless', 'Métal finition dorée'),
    range(8, 10, 'MOSCOT', 'Rectangulaire', 'Acétate'),
    range(11, 12, 'DIOR', 'Rimless', 'Métal'),
    range(13, 15, 'DIOR', 'Carrée oversize', 'Acétate'),
    range(16, 19, 'SAINT LAURENT', 'Ronde', 'Métal'),
    range(20, 28, 'MOSCOT', 'Carrée', 'Acétate'),
  ],
  f1: [
    range(1, 3, 'CELINE', 'Carrée oversize'),
    range(4, 6, 'DOLCE & GABBANA', 'Masque géométrique', 'Métal'),
    range(7, 14, 'LOUIS VUITTON', 'Carrée oversize'),
    range(15, 24, 'PRADA', 'Rectangulaire'),
    range(25, 34, 'LOUIS VUITTON', 'Carrée oversize'),
    range(35, 37, 'CELINE', 'Carrée'),
    range(38, 42, 'DIOR', 'Carrée oversize'),
    range(43, 46, 'SAINT LAURENT', 'Géométrique', 'Métal'),
    range(47, 48, 'CHANEL', 'Carrée oversize'),
    range(49, 56, 'CHANEL', 'Masque & carrée'),
    range(57, 59, 'Hermès', 'Rectangulaire'),
    range(60, 60, 'LOUIS VUITTON', 'Masque géométrique', 'Métal'),
    range(61, 66, 'GUCCI', 'Ronde', 'Métal & acétate'),
    range(67, 73, 'FENDI', 'Ronde', 'Métal'),
    range(74, 78, 'MIU MIU', 'Géométrique', 'Métal'),
    range(79, 82, 'CHANEL', 'Carrée oversize'),
    range(83, 85, 'DOLCE & GABBANA', 'Masque géométrique', 'Métal'),
    range(86, 88, 'CHANEL', 'Ronde oversize'),
    range(89, 94, 'BURBERRY', 'Carrée & ronde'),
    range(95, 100, 'MIU MIU', 'Carrée oversize'),
  ],
  f2: [
    range(1, 7, 'MIU MIU', 'Masque & œil-de-chat', 'Métal & acétate'),
    range(8, 8, 'TIFFANY & Co.', 'Carrée oversize'),
    range(9, 15, 'OFF-WHITE TM', 'Rectangulaire'),
    range(16, 18, 'DIOR', 'Rimless', 'Métal'),
  ],
  f3: [range(1, 6, 'FENDI', 'Rimless', 'Métal finition dorée')],
  h1: [
    range(1, 6, 'FERRARI', 'Navigator', 'Métal & acétate'),
    range(7, 19, 'MOSCOT', 'Carrée', 'Acétate'),
    range(20, 24, 'GIORGIO ARMANI', 'Géométrique', 'Métal'),
    range(25, 26, 'PRADA', 'Ronde', 'Métal'),
    range(27, 27, 'LOUIS VUITTON', 'Aviateur', 'Métal'),
    range(28, 29, 'DIOR', 'Ronde', 'Métal'),
    range(30, 32, 'MONT BLANC', 'Ronde', 'Métal & acétate'),
    range(33, 37, 'PRADA', 'Navigator', 'Métal'),
    range(38, 51, 'GIORGIO ARMANI', 'Navigator géométrique', 'Métal'),
    range(52, 54, 'FERRARI', 'Carrée', 'Acétate'),
    range(55, 58, 'GUCCI', 'Aviateur', 'Métal'),
    range(59, 61, 'PRADA', 'Ronde', 'Métal'),
    range(62, 66, 'DOLCE & GABBANA', 'Rectangulaire', 'Métal'),
    range(67, 76, 'CARTIER', 'Ronde & géométrique', 'Métal finition dorée'),
    range(77, 80, 'CARRERA', 'Masque sport', 'Acétate & métal'),
    range(81, 86, 'FENDI', 'Ronde', 'Métal'),
    range(87, 95, 'CARTIER', 'Rimless', 'Métal finition dorée'),
  ],
};

const brandDescriptions = {
  CELINE: 'Une silhouette parisienne nette, équilibrée par des lignes architecturales et une finition contemporaine.',
  CARTIER: 'Une monture travaillée comme un accessoire précieux, avec des détails métalliques raffinés et une présence intemporelle.',
  MOSCOT: 'Un esprit new-yorkais affirmé, une construction confortable et des volumes graphiques faciles à porter.',
  DIOR: 'Une allure couture structurée, portée par des proportions élégantes et une finition lumineuse.',
  'SAINT LAURENT': 'Des lignes franches et sophistiquées qui signent un look parisien moderne et minimal.',
  'DOLCE & GABBANA': 'Une monture expressive aux détails glamour, pensée pour donner du caractère à la silhouette.',
  'LOUIS VUITTON': 'Une forme audacieuse aux détails soignés, entre inspiration voyage et élégance urbaine.',
  PRADA: 'Un design contemporain aux volumes précis, idéal pour une allure mode et résolument graphique.',
  CHANEL: 'Une silhouette féminine intemporelle, rehaussée de finitions délicates et d’un volume élégant.',
  'Hermès': 'Une ligne sobre et équilibrée où la précision des détails rencontre un confort quotidien.',
  GUCCI: 'Une monture de caractère mêlant codes vintage, volumes contemporains et détails décoratifs.',
  FENDI: 'Un dessin italien affirmé, mis en valeur par des lignes géométriques et des finitions lumineuses.',
  'MIU MIU': 'Une silhouette joueuse et sophistiquée, aux proportions mode et aux contrastes délicats.',
  BURBERRY: 'Une monture inspirée du vestiaire britannique, entre lignes classiques et finitions contemporaines.',
  'TIFFANY & Co.': 'Une monture lumineuse et féminine aux détails élégants, pensée comme un bijou du quotidien.',
  'OFF-WHITE TM': 'Une esthétique urbaine graphique, construite autour de volumes francs et d’une attitude contemporaine.',
  FERRARI: 'Une monture dynamique inspirée de la performance, équilibrée par des finitions élégantes.',
  'GIORGIO ARMANI': 'Un design italien maîtrisé, aux lignes fluides, précises et confortables.',
  'MONT BLANC': 'Une monture masculine raffinée, où la sobriété des lignes souligne la qualité des finitions.',
  CARRERA: 'Une silhouette sportive et aérodynamique, pensée pour un style actif et distinctif.',
};

const colorNames = ['Noir fumé', 'Écaille ambrée', 'Or & brun', 'Argent & bleu', 'Bordeaux dégradé', 'Cristal', 'Vert profond', 'Rose poudré', 'Bleu nuit', 'Champagne'];
const lensNames = ['Verres fumés', 'Verres dégradés', 'Verres bruns', 'Verres bleutés', 'Verres gris', 'Verres miroir subtils'];
const priceBases = {
  CARTIER: 820, CHANEL: 760, DIOR: 740, 'LOUIS VUITTON': 760,
  PRADA: 690, GUCCI: 690, FENDI: 650, 'Hermès': 760,
  CELINE: 650, 'SAINT LAURENT': 650, 'DOLCE & GABBANA': 620,
  'MIU MIU': 620, BURBERRY: 620, 'TIFFANY & Co.': 690,
  'OFF-WHITE TM': 580, FERRARI: 620, 'GIORGIO ARMANI': 580,
  'MONT BLANC': 620, MOSCOT: 540, CARRERA: 500,
};

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rangeFor(setKey, number) {
  const found = catalogRanges[setKey].find((item) => number >= item.from && number <= item.to);
  if (!found) throw new Error(`No catalog classification for ${setKey} #${number}`);
  return found;
}

function makePrice(brand, number, setIndex) {
  const base = priceBases[brand] || 560;
  const steps = Math.floor((900 - base) / 10) + 1;
  return base + ((number * 7 + setIndex * 11 + brand.length) % steps) * 10;
}

function storagePath(set, number) {
  if (set.key === 'u1' && number === 1) return 'products/catalog-2026/unisexe/photo-001.jpg';
  return `products/catalog-2026/${set.gender}/${set.key}-photo-${String(number).padStart(3, '0')}.jpg`;
}

function sourcePath(set, number) {
  return path.join(set.source, `photo_${number}_${set.stamp}.jpg`);
}

function makeProduct(set, setIndex, number, brandIds, categoryIds, publicUrl) {
  const meta = rangeFor(set.key, number);
  const color = colorNames[(number + setIndex * 3 + meta.brand.length) % colorNames.length];
  const lens = lensNames[(number * 2 + setIndex) % lensNames.length];
  const price = makePrice(meta.brand, number, setIndex);
  const code = `${set.key.toUpperCase()}-${String(number).padStart(3, '0')}`;
  const name = `${meta.brand} ${meta.shape} ${color} — Édition ${String(number).padStart(3, '0')}`;
  const short = `${meta.shape} ${color.toLowerCase()}, ${lens.toLowerCase()} et protection UV400.`;
  const full = `${brandDescriptions[meta.brand]} Cette édition ${color.toLowerCase()} associe une monture ${meta.material.toLowerCase()} à des ${lens.toLowerCase()}. Sa forme ${meta.shape.toLowerCase()} offre une présence élégante, tandis que la protection UV400 convient à un usage solaire quotidien. Livrée avec son étui de présentation.`;
  const salePrice = number % 11 === 0 ? Math.max(500, price - 120) : null;
  const slug = `catalogue-2026-${set.key}-${String(number).padStart(3, '0')}-${slugify(meta.brand)}`;

  return {
    name,
    slug,
    sku: `LX-${code}`,
    short_description: short,
    full_description: full,
    brand_id: brandIds.get(meta.brand),
    category_id: categoryIds.get(set.gender),
    gender: set.gender,
    price,
    sale_price: salePrice,
    cost_price: Math.round(price * 0.56),
    stock: 6 + ((number + setIndex) % 13),
    stock_alert_threshold: 4,
    color,
    frame_material: meta.material,
    shape: meta.shape,
    lens_type: lens,
    uv_protection: 'UV400',
    dimensions: meta.shape.includes('oversize') ? '56-18-145 mm' : '53-19-145 mm',
    primary_image: publicUrl,
    gallery_urls: null,
    status: 'active',
    is_featured: number <= 4,
    is_new: true,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
}

async function retry(label, operation, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error(`${label}: ${lastError?.message || lastError}`);
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function upsertSupportingData() {
  const neededBrands = [...new Set(Object.values(catalogRanges).flat().map((item) => item.brand))];
  const { data: currentBrands, error: brandReadError } = await supabase.from('brands').select('id,name,slug');
  if (brandReadError) throw brandReadError;

  const cartier = currentBrands.find((brand) => brand.name === 'CARTER');
  if (cartier) {
    const { error } = await supabase.from('brands').update({ name: 'CARTIER' }).eq('id', cartier.id);
    if (error) throw error;
    cartier.name = 'CARTIER';
  }

  const missingBrands = neededBrands.filter((name) => !currentBrands.some((brand) => brand.name === name));
  if (missingBrands.length) {
    const { error } = await supabase.from('brands').insert(missingBrands.map((name) => ({
      name,
      slug: slugify(name),
      description: `Collection de lunettes ${name} sélectionnée par LXLunettes.`,
      is_active: true,
    })));
    if (error) throw error;
  }

  const categories = [
    { name: 'Collection Hommes', slug: 'collection-hommes', type: 'homme', description: 'Sélection de lunettes pour homme.', is_active: true },
    { name: 'Collection Femmes', slug: 'collection-femmes', type: 'femme', description: 'Sélection de lunettes pour femme.', is_active: true },
    { name: 'Collection Unisexe', slug: 'collection-unisexe', type: 'unisexe', description: 'Sélection de lunettes unisexe.', is_active: true },
  ];
  const { error: categoryUpsertError } = await supabase.from('categories').upsert(categories, { onConflict: 'slug' });
  if (categoryUpsertError) throw categoryUpsertError;

  const [{ data: brands, error: brandsError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
    supabase.from('brands').select('id,name'),
    supabase.from('categories').select('id,type').in('type', ['homme', 'femme', 'unisexe']),
  ]);
  if (brandsError) throw brandsError;
  if (categoriesError) throw categoriesError;

  return {
    brandIds: new Map(brands.map((brand) => [brand.name, brand.id])),
    categoryIds: new Map(categoryRows.map((category) => [category.type, category.id])),
  };
}

async function main() {
  const { brandIds, categoryIds } = await upsertSupportingData();
  const sourceItems = sets.flatMap((set, setIndex) =>
    Array.from({ length: set.count }, (_, offset) => ({ set, setIndex, number: offset + 1 })),
  );

  console.log(`Preparing ${sourceItems.length} catalog items...`);
  const products = await mapLimit(sourceItems, 8, async ({ set, setIndex, number }, index) => {
    const file = sourcePath(set, number);
    await fs.access(file);
    const objectPath = storagePath(set, number);
    const body = await fs.readFile(file);
    await retry(`Upload ${set.key} #${number}`, async () => {
      const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });
      if (error) throw error;
    });
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if ((index + 1) % 25 === 0 || index + 1 === sourceItems.length) {
      console.log(`Uploaded ${index + 1}/${sourceItems.length}`);
    }
    return makeProduct(set, setIndex, number, brandIds, categoryIds, data.publicUrl);
  });

  for (let start = 0; start < products.length; start += 25) {
    const batch = products.slice(start, start + 25);
    await retry(`Product upsert batch ${start / 25 + 1}`, async () => {
      const { error } = await supabase.from('products').upsert(batch, { onConflict: 'slug' });
      if (error) throw error;
    });
    console.log(`Saved products ${start + 1}-${Math.min(start + batch.length, products.length)}`);
  }

  const { count, error } = await supabase.from('products')
    .select('id', { count: 'exact', head: true })
    .like('slug', 'catalogue-2026-%');
  if (error) throw error;
  console.log(JSON.stringify({ imported: products.length, verifiedCatalogRows: count, bucket }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
