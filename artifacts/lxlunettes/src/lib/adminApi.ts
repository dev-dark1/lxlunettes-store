import { supabase } from './supabaseClient';

const serverRequest = async (url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: unknown, config?: any) => {
  const token = localStorage.getItem('lxlunettes_admin_token');
  const query = config?.params
    ? `?${new URLSearchParams(Object.entries(config.params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)])).toString()}`
    : '';
  const response = await fetch(`${url}${query}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Le service d’authentification est indisponible.');
  }
  return { data: payload };
};

const usesServerApi = (url: string) =>
  url.startsWith('/api/media') || url.startsWith('/api/promotions');

// Helper to determine if we need paginated format
const needsPagination = (url: string) => {
  return ['products', 'orders', 'customers', 'reviews', 'stock'].includes(url.split('/')[2] || '');
}

const toCamel = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = toCamel(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

export const adminApi = {
  get: async (url: string, config?: any): Promise<{ data: any }> => {
    if (usesServerApi(url) || url === '/api/admin/auth/me' || url.startsWith('/api/admin/settings') || url.startsWith('/api/admin/customers') || url.startsWith('/api/admin/dashboard') || url === '/api/orders' || url.startsWith('/api/orders/')) {
      return serverRequest(url, 'GET', undefined, config);
    }

    const parts = url.split('/');
    const isSettings = url.startsWith('/api/admin/settings');
    const table = isSettings ? 'settings' : parts[2];
    
    if (!table) return { data: [] };
    
    // Redirect stock to products table since stock table doesn't exist
    const actualTable = table === 'stock' ? 'products' : table;
    
    let query = supabase.from(actualTable).select(
      actualTable === 'products' ? '*, brands(name), categories(name)' : '*',
      { count: 'exact' },
    );
    
    if (config?.params?.search) {
      if (actualTable === 'products' || actualTable === 'customers') {
         query = query.ilike('name', `%${config.params.search}%`);
      }
    }
    if (config?.params?.status) {
      query = query.eq('status', config.params.status);
    }
    // Specific filters
    if (table === 'stock') {
      if (url.includes('low-stock')) {
        query = query.lt('stock', 5); // Example threshold
      }
    }
    
    let limit = config?.params?.limit;
    if (config?.params?.page && limit) {
      const page = config.params.page;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    } else if (limit) {
      query = query.limit(limit);
    }
    
    const { data, count, error } = await query;
    if (error) {
      console.error(`Supabase Error (${actualTable} GET):`, error);
      return { data: needsPagination(url) && limit ? { items: [], total: 0, totalPages: 0 } : [] };
    }
    
    let formattedData = toCamel(data || []);
    
    if (actualTable === 'products') {
      formattedData = formattedData.map((p: any) => ({
        ...p,
        description: p.fullDescription,
        price: Number(p.price),
        salePrice: p.salePrice == null ? undefined : Number(p.salePrice),
        featured: Boolean(p.isFeatured),
        newArrival: Boolean(p.isNew),
        colors: p.color ?? '',
        material: p.frameMaterial ?? '',
        gender: p.gender ?? 'unisexe',
        onSale: p.salePrice != null,
        brand: p.brands?.name ?? '',
        category: p.categories?.name ?? '',
      }));
    }
    
    if (needsPagination(url) && limit) {
      return { data: { items: formattedData, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
    }
    
    return { data: formattedData };
  },
  post: async (url: string, data: any, config?: any): Promise<{ data: any }> => {
    if (usesServerApi(url) || url.startsWith('/api/admin/auth/')) {
      return serverRequest(url, 'POST', data);
    }
    
    if (url === '/api/upload') {
       try {
         const file = data.get('file'); // FormData
         const ext = file.name.split('.').pop();
         const fileName = `${Math.random().toString(36).substring(2)}.${ext}`;
         const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'lxlunettes';
         const { error } = await supabase.storage.from(bucket).upload(fileName, file);
         if (error) throw error;
         const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(fileName);
         const type = ['mp4', 'webm', 'mov'].includes(ext?.toLowerCase() || '') ? 'video' : 'image';
         return { data: { url: publicUrl.publicUrl, type, originalName: file.name } };
       } catch (err: any) {
         console.error("Upload failed in adminApi:", err);
         throw err;
       }
    }
    
    const table = url.startsWith('/api/admin/settings') ? 'settings' : url.split('/')[2];
    
    let payload = { ...data };
    
    if (table === 'products') {
      payload = {
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        short_description: data.shortDescription || '',
        full_description: data.description || '',
        price: data.price,
        sale_price: data.salePrice,
        brand_id: data.brandId || null,
        category_id: data.categoryId || null,
        gender: data.gender || 'unisexe',
        stock: data.stock || 0,
        status: data.status || 'draft',
        is_featured: data.featured || false,
        is_new: data.newArrival || false,
        color: data.colors || null,
        frame_material: data.material || null,
        primary_image: data.primaryImage || null,
        gallery_urls: data.galleryUrls || null,
        video_url: data.videoUrl || null
      };
      Object.keys(payload).forEach(key => (payload as any)[key] == null && delete (payload as any)[key]);
    } else if (table === 'reviews') {
      payload = {
        customer_name: data.customerName,
        photo_url: data.photoUrl || data.customerAvatar || null,
        rating: data.rating,
        comment: data.comment,
        product_id: data.productId || null,
        status: data.status || 'pending',
      };
      Object.keys(payload).forEach(key => (payload as any)[key] == null && delete (payload as any)[key]);
    } else if (table === 'categories') {
      payload = {
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        image_url: data.imageUrl || null,
        is_active: data.isActive !== undefined ? data.isActive : true,
        type: data.type || 'lunettes',
      };
    } else if (table === 'brands') {
      payload = {
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        logo_url: data.logoUrl || null,
        is_active: data.isActive !== undefined ? data.isActive : true,
      };
    } else if (table === 'media') {
      payload = {
        url: data.url,
        type: data.type,
        title: data.title || data.name || '',
        status: data.status || (data.published ? 'active' : 'inactive'),
      };
    } else if (table === 'promotions') {
      payload = {
        label: data.label || data.name,
        discount_type: data.discountType || data.type,
        discount_value: data.discountValue || data.value,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        min_order_amount: data.minOrderAmount || null,
        usage_limit: data.usageLimit || null,
        is_active: data.isActive !== undefined ? data.isActive : true
      };
    } else if (table === 'orders') {
      payload = {
        order_number: data.orderNumber,
        status: data.status,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        city: data.city,
        country: data.country,
        address: data.address,
        customer_note: data.customerNote,
        subtotal: data.subtotal,
        total: data.totalAmount || data.total,
      };
      Object.keys(payload).forEach(key => (payload as any)[key] == null && delete (payload as any)[key]);
    }
    
    delete payload.id;
    
    const { data: res, error } = await supabase.from(table).insert(payload).select().single();
    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
    return { data: toCamel(res) };
  },
  put: async (url: string, data: any): Promise<{ data: any }> => {
    if (usesServerApi(url)) {
      return serverRequest(url, 'PUT', data);
    }
    const parts = url.split('/');
    const isSettings = url.startsWith('/api/admin/settings');
    const table = isSettings ? 'settings' : parts[2];
    
    if (isSettings) {
       return serverRequest(url, 'PUT', data);
    }
    
    const id = parts[3];
    let payload = { ...data };
    
    if (table === 'products') {
      payload = {
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        short_description: data.shortDescription,
        full_description: data.description,
        price: data.price,
        sale_price: data.salePrice,
        brand_id: data.brandId,
        category_id: data.categoryId,
        gender: data.gender,
        stock: data.stock,
        status: data.status,
        is_featured: data.featured,
        is_new: data.newArrival,
        color: data.colors,
        frame_material: data.material,
        primary_image: data.primaryImage,
        gallery_urls: data.galleryUrls,
        video_url: data.videoUrl
      };
      Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    } else if (table === 'reviews') {
      payload = {
        customer_name: data.customerName,
        photo_url: data.photoUrl || data.customerAvatar,
        rating: data.rating,
        comment: data.comment,
        product_id: data.productId,
        status: data.status,
      };
      Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    } else if (table === 'categories') {
      payload = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        image_url: data.imageUrl,
        is_active: data.isActive,
        type: data.type,
      };
      Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    } else if (table === 'brands') {
      payload = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        logo_url: data.logoUrl,
        is_active: data.isActive,
      };
      Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    } else if (table === 'promotions') {
      payload = {
        label: data.label || data.name,
        discount_type: data.discountType || data.type,
        discount_value: data.discountValue || data.value,
        start_date: data.startDate,
        end_date: data.endDate,
        min_order_amount: data.minOrderAmount,
        usage_limit: data.usageLimit,
        is_active: data.isActive
      };
      Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    }
    
    const { data: res, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
    return { data: toCamel(res) };
  },
  patch: async (url: string, data?: any): Promise<{ data: any }> => {
    if (usesServerApi(url) || url.startsWith('/api/orders/') || url.startsWith('/api/admin/customers/')) {
      return serverRequest(url, 'PATCH', data ?? {});
    }
    const parts = url.split('/');
    const table = parts[2];
    const id = parts[3];
    const action = parts[4];
    
    let updateData = data;
    if (table === 'reviews' && action === 'approve') updateData = { status: 'approved' };
    if (table === 'reviews' && action === 'reject') updateData = { status: 'rejected' };
    if (table === 'orders' && action === 'cancel') updateData = { status: 'cancelled' };
    
    const { data: res, error } = await supabase.from(table).update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return { data: toCamel(res) };
  },
  delete: async (url: string): Promise<{ data: any }> => {
    if (usesServerApi(url)) {
      return serverRequest(url, 'DELETE');
    }
    const parts = url.split('/');
    const table = parts[2];
    const id = parts[3];
    
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return { data: { success: true } };
  }
};
