import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Percent, Plus, Trash2, X } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Promo {
  id: string;
  label: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'all' | 'product' | 'category' | 'brand';
  targetId?: string | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

const EMPTY: Partial<Promo> = {
  label: '',
  discountType: 'percentage',
  discountValue: 0,
  appliesTo: 'all',
  targetId: null,
  isActive: true,
};

const dateValue = (value?: string | null) => value ? value.slice(0, 10) : '';

export default function AdminPromotions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Promo>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: promotions = [], isLoading, error } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const response = await adminApi.get('/api/promotions');
      return response.data?.items ?? response.data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: Partial<Promo>) =>
      values.id
        ? (await adminApi.put(`/api/promotions/${values.id}`, values)).data
        : (await adminApi.post('/api/promotions', values)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setModal(null);
      toast({ title: 'Promotion enregistrée dans Supabase ✓' });
    },
    onError: (caught: Error) => toast({ title: 'Erreur', description: caught.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/api/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setDeleteId(null);
      toast({ title: 'Promotion supprimée' });
    },
    onError: (caught: Error) => toast({ title: 'Erreur', description: caught.message, variant: 'destructive' }),
  });

  const canSave = Boolean(
    form.label?.trim()
    && Number(form.discountValue) > 0
    && (form.appliesTo === 'all' || form.targetId),
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-serif text-3xl uppercase tracking-widest">Promotions</h1><p className="mt-1 text-sm text-muted-foreground">{promotions.length} promotion(s)</p></div>
        <Button onClick={() => { setForm(EMPTY); setModal('create'); }} className="uppercase tracking-widest text-xs"><Plus className="mr-2 h-4 w-4" /> Nouvelle promotion</Button>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border border-border bg-card p-6 md:flex-row">
        <div><h2 className="mb-1 text-xs font-medium uppercase tracking-widest">Bannière promotionnelle</h2><p className="text-[11px] text-muted-foreground">Affichez un message promotionnel en haut du site.</p></div>
        <div className="grid w-full max-w-xl flex-1 grid-cols-1 gap-3 md:grid-cols-3">
          <Input id="promo-banner-text" placeholder="Ex: -20% sur une sélection" className="md:col-span-2" />
          <Button onClick={async () => {
            const text = (document.getElementById('promo-banner-text') as HTMLInputElement).value.trim();
            if (!text) return;
            await adminApi.put('/api/admin/settings/PROMO_BANNER_TEXT', { value: text });
            await adminApi.put('/api/admin/settings/PROMO_BANNER_ACTIVE', { value: 'true' });
            toast({ title: 'Bannière activée ✓' });
          }} className="text-xs uppercase tracking-widest">Activer</Button>
        </div>
      </div>

      {error ? (
        <div className="border border-destructive/40 bg-destructive/10 p-8 text-center text-destructive">{(error as Error).message}</div>
      ) : (
        <div className="mobile-scrollbar overflow-x-auto border border-border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground"><th className="p-4">Nom</th><th className="p-4">Réduction</th><th className="p-4">Portée</th><th className="p-4">Statut</th><th className="p-4">Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 4 }, (_, index) => <tr key={index}><td colSpan={5} className="p-4"><Skeleton className="h-6" /></td></tr>) : promotions.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground"><Percent className="mx-auto mb-2 h-8 w-8 opacity-30" />Aucune promotion</td></tr>
              ) : (promotions as Promo[]).map(promo => (
                <tr key={promo.id} className="border-b border-border/50">
                  <td className="p-4 font-medium">{promo.label}</td>
                  <td className="p-4">{promo.discountType === 'percentage' ? `${promo.discountValue}%` : `${promo.discountValue} MAD`}</td>
                  <td className="p-4 capitalize text-muted-foreground">{promo.appliesTo === 'all' ? 'Tout le catalogue' : promo.appliesTo}</td>
                  <td className="p-4"><span className={`rounded-sm px-2 py-1 text-[10px] uppercase ${promo.isActive ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}`}>{promo.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="p-4"><div className="flex gap-2"><button onClick={() => { setForm(promo); setModal('edit'); }}><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteId(promo.id)}><Trash2 className="h-4 w-4 text-destructive" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-lg border border-border bg-card" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-6"><h2 className="font-serif text-xl">{modal === 'create' ? 'Nouvelle promotion' : 'Modifier la promotion'}</h2><button onClick={() => setModal(null)}><X /></button></div>
            <div className="space-y-4 p-6">
              <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Nom *</label><Input value={form.label ?? ''} onChange={event => setForm(current => ({ ...current, label: event.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Type</label><select value={form.discountType ?? 'percentage'} onChange={event => setForm(current => ({ ...current, discountType: event.target.value as Promo['discountType'] }))} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"><option value="percentage">Pourcentage (%)</option><option value="fixed">Montant fixe (MAD)</option></select></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Valeur *</label><Input type="number" min="0.01" step="0.01" value={form.discountValue ?? 0} onChange={event => setForm(current => ({ ...current, discountValue: Number(event.target.value) }))} /></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Portée</label><select value={form.appliesTo ?? 'all'} onChange={event => setForm(current => ({ ...current, appliesTo: event.target.value as Promo['appliesTo'], targetId: event.target.value === 'all' ? null : current.targetId }))} className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"><option value="all">Tout le catalogue</option><option value="product">Produit</option><option value="category">Catégorie</option><option value="brand">Marque</option></select></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">ID cible</label><Input value={form.targetId ?? ''} disabled={form.appliesTo === 'all'} onChange={event => setForm(current => ({ ...current, targetId: event.target.value || null }))} placeholder="UUID Supabase" /></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Date de début</label><Input type="date" value={dateValue(form.startDate)} onChange={event => setForm(current => ({ ...current, startDate: event.target.value || null }))} /></div>
                <div><label className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">Date de fin</label><Input type="date" value={dateValue(form.endDate)} onChange={event => setForm(current => ({ ...current, endDate: event.target.value || null }))} /></div>
              </div>
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.isActive ?? true} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} /> Promotion active</label>
            </div>
            <div className="flex justify-end gap-3 border-t border-border p-6"><Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button><Button disabled={!canSave || save.isPending} onClick={() => save.mutate(form)}>{save.isPending ? 'Enregistrement...' : 'Sauvegarder'}</Button></div>
          </div>
        </div>
      )}

      {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-sm border border-border bg-card p-6 text-center"><Trash2 className="mx-auto mb-4 h-8 w-8 text-destructive" /><h3>Supprimer cette promotion ?</h3><div className="mt-6 flex justify-center gap-3"><Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(deleteId)}>Supprimer</Button></div></div></div>}
    </div>
  );
}
