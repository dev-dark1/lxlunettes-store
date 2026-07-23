import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Image, Package, Copy, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { FileUploadButton } from '@/components/FileUploadButton';

interface Product {
  id: string; name: string; slug: string; description?: string; shortDescription?: string;
  price: number; salePrice?: number | null; oldPrice?: number; discount?: number; onSale?: boolean;
  brand?: string; category?: string; status: string; sku?: string; barcode?: string;
  primaryImage?: string; brandId?: string; categoryId?: string;
  colors?: string; sizes?: string; material?: string; gender?: string;
  featured?: boolean; newArrival?: boolean; bestSeller?: boolean;
  seoTitle?: string; seoDescription?: string; metaKeywords?: string;
  stock?: number; galleryUrls?: string; videoUrl?: string;
}

const EMPTY: Partial<Product> = {
  name: '', price: 0, status: 'active', description: '', shortDescription: '',
  sku: '', barcode: '', primaryImage: '', colors: '', sizes: '', material: '',
  gender: 'unisexe', featured: false, newArrival: false, bestSeller: false, onSale: false,
  seoTitle: '', seoDescription: '', metaKeywords: '',
};

const GENDERS = ['homme', 'femme', 'unisexe'];
const STATUSES = [{ v: 'active', l: 'Actif' }, { v: 'inactive', l: 'Inactif' }, { v: 'archived', l: 'Archivé' }];

type TabKey = 'general' | 'details' | 'seo';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'general', label: 'Général' },
  { key: 'details', label: 'Détails' },
  { key: 'seo', label: 'SEO & Meta' },
];

export default function AdminProducts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Product>>(EMPTY);
  const [tab, setTab] = useState<TabKey>('general');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const f = (key: keyof Product, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: async () => (await adminApi.get('/api/products', { params: { page, limit: 15, search: search || undefined } })).data,
  });

  const { data: brands } = useQuery({ queryKey: ['admin-brands-list'], queryFn: async () => (await adminApi.get('/api/brands')).data });
  const { data: categories } = useQuery({ queryKey: ['admin-cats-list'], queryFn: async () => (await adminApi.get('/api/categories')).data });

  const save = useMutation({
    mutationFn: async (d: Partial<Product>) => {
      if (!d.brandId) throw new Error("Veuillez sélectionner une Marque.");
      if (!d.categoryId) throw new Error("Veuillez sélectionner une Catégorie.");
      if (d.onSale && (!d.salePrice || d.salePrice <= 0 || d.salePrice >= Number(d.price))) {
        throw new Error('Le prix promo doit être supérieur à 0 et inférieur au prix normal.');
      }
      let finalData = { ...d, salePrice: d.onSale ? d.salePrice : null };
      if (!finalData.sku) {
        finalData.sku = `LX-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      return finalData.id
        ? (await adminApi.put(`/api/products/${finalData.id}`, finalData)).data
        : (await adminApi.post('/api/products', finalData)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setModal(null); toast({ title: 'Produit sauvegardé ✓' }); },
    onError: (e: any) => toast({ title: e?.message || e?.response?.data?.error || 'Erreur lors de la sauvegarde', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/api/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setDeleteId(null); toast({ title: 'Produit supprimé' }); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const duplicate = (p: Product) => {
    const { id, ...rest } = p;
    setForm({ ...rest, name: `${rest.name} (copie)`, slug: `${rest.slug}-copie`, sku: '' });
    setModal('create'); setTab('general');
  };

  const openEdit = (p: Product) => { setForm({ ...p, onSale: Boolean(p.salePrice) }); setModal('edit'); setTab('general'); };
  const openCreate = () => { setForm(EMPTY); setModal('create'); setTab('general'); };
  const products: Product[] = data?.items ?? [];

  const field = (label: string, key: keyof Product, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">{label}</label>
      <Input type={type} value={(form as any)[key] ?? ''} placeholder={placeholder}
        onChange={e => f(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="bg-background border-border text-foreground" />
    </div>
  );

  const checkbox = (label: string, key: keyof Product) => (
    <label key={key} className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={Boolean((form as any)[key])} onChange={e => f(key, e.target.checked)} className="accent-primary w-4 h-4" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </label>
  );

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-serif text-foreground tracking-[0.14em] uppercase sm:text-3xl sm:tracking-widest">Produits</h1>
          <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} produits au total</p>
        </div>
        <Button onClick={openCreate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nouveau produit
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-sm border border-border bg-card">
        <div className="mobile-scrollbar overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Image</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Nom / SKU</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Prix</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Marque</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground hidden md:table-cell">Catégorie</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? [...Array(6)].map((_, i) => (
              <tr key={i} className="border-b border-border/50"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 bg-muted" /></td></tr>
            )) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucun produit trouvé</p>
              </td></tr>
            ) : products.map((p, i) => (
              <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  {p.primaryImage
                    ? <img src={p.primaryImage} alt={p.name} className="w-10 h-10 object-cover rounded-sm bg-muted" />
                    : <div className="w-10 h-10 bg-muted rounded-sm flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{p.sku}</div>
                  <div className="flex gap-1 mt-0.5">
                    {p.featured && <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary">Vedette</span>}
                    {p.newArrival && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400">Nouveau</span>}
                    {p.bestSeller && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400">Best</span>}
                    <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/15 text-violet-300 capitalize">{p.gender || 'unisexe'}</span>
                    {p.salePrice && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/15 text-red-400">Sale</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-primary font-medium">{p.salePrice ?? p.price} MAD</div>
                  {p.salePrice && <div className="text-[11px] text-muted-foreground line-through">{p.price} MAD</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.brand ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.category ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${p.status === 'active' ? 'bg-green-500/15 text-green-400' : p.status === 'archived' ? 'bg-orange-500/15 text-orange-400' : 'bg-muted text-muted-foreground'}`}>{STATUSES.find(s => s.v === p.status)?.l ?? p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:text-primary transition-colors" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => duplicate(p)} className="p-1.5 hover:text-blue-400 transition-colors" title="Dupliquer"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:text-destructive transition-colors" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-border bg-transparent text-muted-foreground"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-xs text-muted-foreground">{page} / {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)} className="border-border bg-transparent text-muted-foreground"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-sm w-full max-w-2xl max-h-[92dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0 sm:p-6">
              <h2 className="font-serif text-foreground text-xl">{modal === 'create' ? 'Nouveau produit' : 'Modifier le produit'}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            {/* Tabs */}
            <div className="mobile-scrollbar flex overflow-x-auto border-b border-border shrink-0">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`shrink-0 px-4 py-3 text-xs uppercase tracking-widest transition-colors sm:px-5 ${tab === t.key ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 sm:p-6">
              {tab === 'general' && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Nom *</label>
                      <Input value={form.name ?? ''} onChange={e => { f('name', e.target.value); f('slug', autoSlug(e.target.value)); }}
                        className="bg-background border-border text-foreground" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Slug</label>
                      <Input value={form.slug ?? ''} onChange={e => f('slug', e.target.value)} className="bg-background border-border text-foreground font-mono text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">SKU</label>
                      <Input value={form.sku ?? ''} onChange={e => f('sku', e.target.value)} className="bg-background border-border text-foreground font-mono text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Prix (MAD) *</label>
                      <Input type="number" value={form.price ?? 0} onChange={e => f('price', Number(e.target.value))} className="bg-background border-border text-foreground" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Prix promo (MAD)</label>
                      <Input type="number" value={form.salePrice ?? ''} disabled={!form.onSale} onChange={e => f('salePrice', e.target.value ? Number(e.target.value) : null)} className="bg-background border-border text-foreground disabled:opacity-40" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Ancien prix (MAD)</label>
                      <Input type="number" value={form.oldPrice ?? ''} onChange={e => f('oldPrice', e.target.value ? Number(e.target.value) : undefined)} className="bg-background border-border text-foreground" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Remise (%)</label>
                      <Input type="number" min={0} max={100} value={form.discount ?? ''} onChange={e => f('discount', e.target.value ? Number(e.target.value) : undefined)} className="bg-background border-border text-foreground" />
                    </div>
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/[0.06] p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.onSale)}
                      onChange={(event) => setForm((current) => ({ ...current, onSale: event.target.checked, salePrice: event.target.checked ? current.salePrice : null }))}
                      className="accent-red-500 w-4 h-4 mt-0.5"
                    />
                    <span>
                      <span className="block text-sm text-foreground">Afficher dans la section Sale</span>
                      <span className="block text-xs text-muted-foreground mt-1">Le produit reste aussi visible dans sa section Homme, Femme ou Unisexe.</span>
                    </span>
                  </label>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Description courte</label>
                    <textarea value={form.shortDescription ?? ''} onChange={e => f('shortDescription', e.target.value)}
                      rows={2} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Description complète</label>
                    <textarea value={form.description ?? ''} onChange={e => f('description', e.target.value)}
                      rows={4} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Marque</label>
                      <select value={form.brandId ?? ''} onChange={e => f('brandId', e.target.value)}
                        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">— Marque —</option>
                        {(brands ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Catégorie</label>
                      <select value={form.categoryId ?? ''} onChange={e => f('categoryId', e.target.value)}
                        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">— Catégorie —</option>
                        {(categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Statut</label>
                      <select value={form.status ?? 'active'} onChange={e => f('status', e.target.value)}
                        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Genre</label>
                      <select value={form.gender ?? 'unisexe'} onChange={e => f('gender', e.target.value)}
                        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Image principale</label>
                    <div className="flex gap-2 items-stretch">
                      <Input value={form.primaryImage ?? ''} onChange={e => f('primaryImage', e.target.value)} placeholder="https://..." className="bg-background border-border text-foreground flex-1" />
                      <FileUploadButton
                        accept="image/*"
                        label="Importer"
                        compact
                        onUploaded={(url) => f('primaryImage', url)}
                      />
                    </div>
                    {form.primaryImage && (
                      <img src={form.primaryImage} alt="Aperçu" className="mt-2 h-20 w-auto object-cover rounded-sm border border-border" onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {checkbox('Produit vedette', 'featured')}
                    {checkbox('Nouvelle arrivée', 'newArrival')}
                    {checkbox('Best seller', 'bestSeller')}
                  </div>
                </>
              )}

              {tab === 'details' && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {field('Matière', 'material', 'text', 'Acier inoxydable, Titane...')}
                    {field('Code-barres / EAN', 'barcode', 'text', '3700000000000')}
                    {field('Couleurs disponibles', 'colors', 'text', 'Noir, Doré, Argenté...')}
                    {field('Tailles disponibles', 'sizes', 'text', 'S, M, L ou 52, 54, 56')}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Stock actuel</label>
                      <Input type="number" min={0} value={form.stock ?? 0} onChange={e => f('stock', Number(e.target.value))} className="bg-background border-border text-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Galerie d'images (URLs, une par ligne)</label>
                    <textarea value={(form as any).galleryUrls ?? ''} onChange={e => f('galleryUrls' as any, e.target.value)} rows={4} placeholder="https://image1.jpg&#10;https://image2.jpg"
                      className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs mb-2" />
                    <FileUploadButton
                        accept="image/*"
                        label="Ajouter à la galerie"
                        compact
                        onUploaded={(url) => f('galleryUrls' as any, ((form as any).galleryUrls ? (form as any).galleryUrls + '\n' : '') + url)}
                      />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Vidéo produit</label>
                    <div className="flex gap-2 items-stretch">
                      <Input value={(form as any).videoUrl ?? ''} onChange={e => f('videoUrl' as any, e.target.value)} placeholder="https://..." className="bg-background border-border text-foreground flex-1" />
                      <FileUploadButton
                        accept="video/*"
                        label="Importer"
                        compact
                        onUploaded={(url) => f('videoUrl' as any, url)}
                      />
                    </div>
                  </div>
                </>
              )}

              {tab === 'seo' && (
                <>
                  {field('Titre SEO', 'seoTitle', 'text', 'Titre pour les moteurs de recherche...')}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Description SEO</label>
                    <textarea value={form.seoDescription ?? ''} onChange={e => f('seoDescription', e.target.value)}
                      rows={3} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  {field('Mots-clés (séparés par virgule)', 'metaKeywords', 'text', 'lunettes, soleil, luxe...')}
                  <div className="bg-muted/30 rounded-sm p-4 text-xs text-muted-foreground space-y-2">
                    <p className="text-foreground font-medium text-sm">Aperçu Google</p>
                    <p className="text-blue-400 text-sm">{form.seoTitle || form.name || 'Titre du produit'}</p>
                    <p className="text-green-600 text-xs">lxlunettes.com/produits/{form.slug || 'produit'}</p>
                    <p>{form.seoDescription || form.description || 'Description du produit...'}</p>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end shrink-0">
              <Button variant="ghost" onClick={() => setModal(null)} className="text-muted-foreground">Annuler</Button>
              <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name}
                className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">
                {save.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm p-6 max-w-sm w-full text-center">
            <Trash2 className="w-8 h-8 text-destructive mx-auto mb-4" />
            <h3 className="text-foreground font-medium mb-2">Supprimer ce produit ?</h3>
            <p className="text-muted-foreground text-sm mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-muted-foreground">Annuler</Button>
              <Button onClick={() => remove.mutate(deleteId!)} disabled={remove.isPending} variant="destructive" className="uppercase tracking-widest text-xs">
                {remove.isPending ? '...' : 'Supprimer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
