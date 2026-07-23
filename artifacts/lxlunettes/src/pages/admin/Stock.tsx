import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, X, Database, AlertTriangle, Pencil } from 'lucide-react';

export default function AdminStock() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState(false);
  
  // Using new stock as the direct form state
  const [form, setForm] = useState({ productId: '', stock: 0 });
  const [page, setPage] = useState(1);

  // We query products for the main stock table
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-stock', page],
    queryFn: async () => (await adminApi.get('/api/products', { params: { page, limit: 20 } })).data,
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: async () => (await adminApi.get('/api/stock/low-stock')).data, // adminApi maps stock to products
  });

  const updateStock = useMutation({
    mutationFn: async (d: typeof form) => {
      // Find the product so we can send all fields it requires if needed, but PUT with partial data is handled if we omit fields.
      // Wait, adminApi PUT merges with existing data if we don't send everything?
      // Actually, if we send undefined for other fields, they are ignored by adminApi payload cleaner.
      // But we should just fetch the full product or use PATCH. `adminApi` doesn't have a specific patch for stock.
      // Let's just fetch it first.
      const current = productsData?.items?.find((p: any) => p.id === d.productId);
      if (!current) throw new Error("Product not found");
      return (await adminApi.put(`/api/products/${d.productId}`, { ...current, stock: d.stock })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-low-stock'] });
      setModal(false);
      setForm({ productId: '', stock: 0 });
      toast({ title: 'Stock mis à jour ✓' });
    },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const items = productsData?.items ?? productsData ?? [];
  const lowStockItems: any[] = lowStockData?.items ?? lowStockData ?? [];

  const openUpdateModal = (product: any) => {
    setForm({ productId: product.id, stock: product.stock || 0 });
    setModal(true);
  };

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground tracking-widest uppercase">Stock</h1>
          <p className="text-muted-foreground text-sm mt-1">Niveaux de stock actuels</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h3 className="text-orange-400 font-medium text-sm uppercase tracking-widest">Stock faible — {lowStockItems.length} produit(s)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((p: any) => (
              <div key={p.id} className="bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-sm text-xs cursor-pointer hover:bg-orange-500/20" onClick={() => openUpdateModal(p)}>
                <span className="text-orange-300">{p.name}</span>
                <span className="text-orange-500 ml-2 font-mono">Qté: {p.stock ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Table */}
      <div className="min-w-0 overflow-hidden rounded-sm border border-border bg-card">
        <div className="mobile-scrollbar overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Produit</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">SKU</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">En Stock</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? [...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-border/50"><td colSpan={5} className="px-4 py-3"><Skeleton className="h-6 bg-muted" /></td></tr>
            )) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground"><Database className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucun produit</p></td></tr>
            ) : items.map((p: any) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono">{p.sku || '—'}</td>
                <td className="px-4 py-3 font-mono text-foreground">
                  <span className={p.stock <= 5 ? "text-orange-400 font-bold" : ""}>{p.stock || 0}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${p.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {p.status === 'active' ? 'Actif' : p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openUpdateModal(p)}
                    className="border-border bg-transparent text-primary hover:bg-primary/10 text-[10px] uppercase tracking-widest h-7"
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Ajuster
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {productsData?.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-border">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-border bg-transparent text-muted-foreground">Précédent</Button>
            <span className="text-xs text-muted-foreground">{page} / {productsData.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === productsData.totalPages} onClick={() => setPage(p => p + 1)} className="border-border bg-transparent text-muted-foreground">Suivant</Button>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-card border border-border rounded-sm w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-serif text-foreground text-xl">Ajuster le stock</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Produit</label>
                <div className="w-full bg-muted border border-border rounded-sm px-3 py-2 text-sm text-foreground">
                  {items.find((p: any) => p.id === form.productId)?.name || 'Produit'}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Nouveau Stock</label>
                <Input type="number" min={0} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} className="bg-background border-border text-foreground" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setModal(false)} className="text-muted-foreground">Annuler</Button>
              <Button onClick={() => updateStock.mutate(form)} disabled={updateStock.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">
                {updateStock.isPending ? '...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
