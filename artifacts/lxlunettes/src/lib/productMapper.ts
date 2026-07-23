import type { Product } from '@/components/ProductCard';

export type StoreProduct = Product & {
  gender: 'homme' | 'femme' | 'unisexe';
  brandId?: string;
  categoryId?: string;
  createdAt?: string;
};

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function normalizeProduct(row: any): StoreProduct {
  const relatedBrand = Array.isArray(row.brands) ? row.brands[0] : row.brands;
  const relatedCategory = Array.isArray(row.categories) ? row.categories[0] : row.categories;

  return {
    ...row,
    id: row.id,
    name: row.name ?? '',
    slug: row.slug ?? '',
    sku: row.sku ?? '',
    price: numberOrNull(row.price) ?? 0,
    salePrice: numberOrNull(row.salePrice ?? row.sale_price),
    shortDescription: row.shortDescription ?? row.short_description ?? '',
    description: row.description ?? row.fullDescription ?? row.full_description ?? '',
    fullDescription: row.fullDescription ?? row.full_description ?? '',
    brand: row.brand ?? relatedBrand?.name ?? '',
    brandId: row.brandId ?? row.brand_id,
    category: row.category ?? relatedCategory?.name ?? '',
    categoryId: row.categoryId ?? row.category_id,
    primaryImage: row.primaryImage ?? row.primary_image ?? null,
    galleryUrls: row.galleryUrls ?? row.gallery_urls ?? null,
    videoUrl: row.videoUrl ?? row.video_url ?? null,
    featured: Boolean(row.featured ?? row.isFeatured ?? row.is_featured),
    newArrival: Boolean(row.newArrival ?? row.isNew ?? row.is_new),
    isNew: Boolean(row.isNew ?? row.is_new),
    stock: Number(row.stock ?? 0),
    gender: row.gender ?? 'unisexe',
    createdAt: row.createdAt ?? row.created_at,
    color: row.color ?? null,
    frameMaterial: row.frameMaterial ?? row.frame_material ?? null,
    shape: row.shape ?? null,
    lensType: row.lensType ?? row.lens_type ?? null,
    uvProtection: row.uvProtection ?? row.uv_protection ?? null,
    dimensions: row.dimensions ?? null,
  };
}
