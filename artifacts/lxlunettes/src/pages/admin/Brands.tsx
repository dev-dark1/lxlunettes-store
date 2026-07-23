import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, X, Bookmark } from 'lucide-react';
import { FileUploadButton } from '@/components/FileUploadButton';

interface Brand { id: string; name: string; slug: string; description?: string; logoUrl?: string; isActive: boolean; }
const EMPTY: Partial<Brand> = { name: '', slug: '', description: '', logoUrl: '', isActive: true };

export default function AdminBrands() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Brand>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => (await adminApi.get('/api/brands')).data,
  });

  const save = useMutation({
    mutationFn: async (d: Partial<Brand>) => {
      if (d.id) return (await adminApi.put(`/api/brands/${d.id}`, d)).data;
      return (await adminApi.post('/api/brands', d)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-brands'] }); setModal(null); toast({ title: 'Marque sauvegardée ✓' }); },
    onError: (e: any) => toast({ title: e?.message || 'Erreur lors de la sauvegarde', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/api/brands/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-brands'] }); setDeleteId(null); toast({ title: 'Marque supprimée' }); },
    onError: (e: any) => toast({ title: e?.message || 'Erreur lors de la suppression', variant: 'destructive' }),
  });

  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground tracking-widest uppercase">Marques</h1>
          <p className="text-muted-foreground text-sm mt-1">{brands.length} marques</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setModal('create'); }} className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle marque
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? [...Array(6)].map((_, i) => <div key={i} className="bg-card border border-border rounded-sm h-28 animate-pulse" />) :
         brands.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-muted-foreground">
            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucune marque</p>
          </div>
        ) : brands.map((b: Brand) => (
          <div key={b.id} className="bg-card border border-border rounded-sm p-5 flex items-center gap-4 group">
            {b.logoUrl ? <img src={b.logoUrl} alt={b.name} className="w-20 h-12 object-contain" />
              : <div className="w-14 h-14 bg-muted rounded-sm flex items-center justify-center text-muted-foreground font-serif text-xl">{b.name.charAt(0)}</div>}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">{b.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{b.slug}</div>
              <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${b.isActive ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}`}>{b.isActive ? 'Actif' : 'Inactif'}</span>
            </div>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setForm(b); setModal('edit'); }} className="p-1.5 hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDeleteId(b.id)} className="p-1.5 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-sm w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-serif text-foreground text-xl">{modal === 'create' ? 'Nouvelle marque' : 'Modifier'}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Nom</label>
                <Input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))} className="bg-background border-border text-foreground" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Slug</label>
                <Input value={form.slug ?? ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="bg-background border-border text-foreground font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Logo (PNG, SVG, JPG ou URL)</label>
                <div className="flex gap-2 items-stretch">
                  <Input value={form.logoUrl ?? ''} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." className="bg-background border-border text-foreground flex-1" />
                  <FileUploadButton
                    accept=".png,.svg,.jpg,.jpeg,.webp,image/*"
                    label="Importer"
                    onUploaded={(url) => setForm((current) => ({ ...current, logoUrl: url }))}
                  />
                </div>
                {form.logoUrl && (
                  <div className="mt-3 h-20 rounded-lg border border-border bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_70%)] p-3">
                    <img src={form.logoUrl} alt="Aperçu du logo" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</label>
                <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="brand-active" checked={form.isActive ?? true} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-primary" />
                <label htmlFor="brand-active" className="text-sm text-muted-foreground">Active</label>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setModal(null)} className="text-muted-foreground">Annuler</Button>
              <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">
                {save.isPending ? '...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm p-6 max-w-sm w-full text-center">
            <Trash2 className="w-8 h-8 text-destructive mx-auto mb-4" />
            <h3 className="text-foreground font-medium mb-2">Supprimer cette marque ?</h3>
            <p className="text-muted-foreground text-sm mb-6">Les produits associés ne seront pas supprimés.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-muted-foreground">Annuler</Button>
              <Button onClick={() => remove.mutate(deleteId!)} disabled={remove.isPending} variant="destructive" className="uppercase tracking-widest text-xs">Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
