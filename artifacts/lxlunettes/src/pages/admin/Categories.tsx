import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, X, Tags } from 'lucide-react';

interface Category { id: string; name: string; slug: string; description?: string; imageUrl?: string; isActive: boolean; }
const EMPTY: Partial<Category> = { name: '', slug: '', description: '', imageUrl: '', isActive: true };

export default function AdminCategories() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Category>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => (await adminApi.get('/api/categories')).data,
  });

  const save = useMutation({
    mutationFn: async (d: Partial<Category>) => {
      if (d.id) return (await adminApi.put(`/api/categories/${d.id}`, d)).data;
      return (await adminApi.post('/api/categories', d)).data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); setModal(null); toast({ title: 'Catégorie sauvegardée ✓' }); },
    onError: (e: any) => toast({ title: e?.message || 'Erreur lors de la sauvegarde', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/api/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); setDeleteId(null); toast({ title: 'Catégorie supprimée' }); },
    onError: (e: any) => toast({ title: e?.message || 'Erreur lors de la suppression', variant: 'destructive' }),
  });

  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif text-foreground tracking-widest uppercase">Catégories</h1>
          <p className="text-muted-foreground text-sm mt-1">{categories.length} catégories</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setModal('create'); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle catégorie
        </Button>
      </div>

      <div className="min-w-0 overflow-hidden rounded-sm border border-border bg-card">
        <div className="mobile-scrollbar overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Nom</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Slug</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Statut</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? [...Array(4)].map((_, i) => (
              <tr key={i} className="border-b border-border/50"><td colSpan={4} className="px-4 py-3"><div className="h-6 bg-muted rounded animate-pulse" /></td></tr>
            )) : categories.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground"><Tags className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucune catégorie</p></td></tr>
            ) : categories.map((c: Category) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${c.isActive ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}`}>{c.isActive ? 'Actif' : 'Inactif'}</span>
                </td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <button onClick={() => { setForm(c); setModal('edit'); }} className="p-1.5 hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-sm w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-serif text-foreground text-xl">{modal === 'create' ? 'Nouvelle catégorie' : 'Modifier'}</h2>
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
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</label>
                <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Image (URL)</label>
                <Input value={form.imageUrl ?? ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="bg-background border-border text-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="cat-active" checked={form.isActive ?? true} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-primary" />
                <label htmlFor="cat-active" className="text-sm text-muted-foreground">Actif</label>
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
            <h3 className="text-foreground font-medium mb-2">Supprimer cette catégorie ?</h3>
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
