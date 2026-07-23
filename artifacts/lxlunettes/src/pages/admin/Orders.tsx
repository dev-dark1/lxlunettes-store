import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, ImageOff, MessageCircle, Search, ShoppingCart, X } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  ['new', 'Nouvelle'],
  ['pending', 'En attente'],
  ['confirmed', 'Confirmée'],
  ['paid', 'Paiement reçu'],
  ['preparing', 'En préparation'],
  ['shipped', 'Expédiée'],
  ['delivered', 'Livrée'],
  ['cancelled', 'Annulée'],
] as const;

const STATUS_LABELS = Object.fromEntries(STATUSES);
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-amber-500/15 text-amber-400',
  pending: 'bg-yellow-500/15 text-yellow-400',
  confirmed: 'bg-blue-500/15 text-blue-400',
  paid: 'bg-emerald-500/15 text-emerald-400',
  preparing: 'bg-purple-500/15 text-purple-400',
  shipped: 'bg-indigo-500/15 text-indigo-400',
  delivered: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

const money = (value: unknown) => `${Number(value ?? 0).toFixed(2)} MAD`;

export default function AdminOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, statusFilter],
    queryFn: async () => (await adminApi.get('/api/orders', { params: { page, limit: 15, search: search || undefined, status: statusFilter || undefined } })).data,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => status === 'cancelled'
      ? (await adminApi.patch(`/api/orders/${id}/cancel`)).data
      : (await adminApi.patch(`/api/orders/${id}/status`, { status })).data,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setDetail((current: any) => current?.id === updated.id ? updated : current);
      toast({ title: 'Statut mis à jour ✓' });
    },
    onError: (error: any) => toast({ title: 'Mise à jour impossible', description: error.message, variant: 'destructive' }),
  });

  const orders = data?.items ?? [];

  const confirmPayment = async (order: any) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'paid' });
    } catch {
      return;
    }
    const phone = String(order.customerPhone || '').replace(/\D/g, '').replace(/^0/, '212');
    if (phone) {
      const message = `Bonjour ${order.customerName}, le paiement de la commande ${order.orderNumber} a bien été reçu. Merci pour votre confiance.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-serif tracking-widest uppercase">Commandes</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data?.total ?? 0} commandes</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Numéro de commande…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="bg-card pl-9" />
        </div>
        <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-sm border border-border bg-card px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="mobile-scrollbar overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border"><tr className="text-left">
            {['Numéro', 'Client', 'Total', 'Statut', 'Date', 'Actions'].map((label) => <th key={label} className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</th>)}
          </tr></thead>
          <tbody>
            {isLoading ? [...Array(5)].map((_, index) => <tr key={index}><td colSpan={6} className="p-4"><Skeleton className="h-7" /></td></tr>) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-14 text-center text-muted-foreground"><ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-30" />Aucune commande</td></tr>
            ) : orders.map((order: any) => (
              <tr key={order.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-primary">{order.orderNumber}</td>
                <td className="px-4 py-3"><p>{order.customerName}</p><p className="text-[11px] text-muted-foreground">{order.customerPhone}</p></td>
                <td className="px-4 py-3 font-medium">{money(order.total ?? order.totalAmount)}</td>
                <td className="px-4 py-3"><span className={`rounded-sm px-2 py-1 text-[10px] uppercase tracking-widest ${STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground'}`}>{STATUS_LABELS[order.status] ?? order.status}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2">
                  <button onClick={() => setDetail(order)} className="p-1.5 hover:text-primary" title="Détails"><Eye className="h-4 w-4" /></button>
                  <select value={order.status} onChange={(event) => updateStatus.mutate({ id: order.id, status: event.target.value })} className="rounded-sm border border-border bg-background px-2 py-1 text-[11px]">
                    {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.totalPages > 1 && <div className="flex items-center justify-center gap-4 border-t border-border p-4"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Précédent</Button><span className="text-xs text-muted-foreground">{page} / {data.totalPages}</span><Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage((value) => value + 1)}>Suivant</Button></div>}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-border bg-card" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-6"><div><p className="text-[10px] uppercase tracking-widest text-primary">Détails</p><h2 className="font-serif text-xl">Commande {detail.orderNumber}</h2></div><button onClick={() => setDetail(null)}><X className="h-5 w-5 text-muted-foreground" /></button></div>
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[['Client', detail.customerName], ['Téléphone', detail.customerPhone], ['Email', detail.customerEmail], ['Ville', `${detail.city ?? '—'}, ${detail.country ?? '—'}`]].map(([label, value]) => <div key={label}><p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p>{value || '—'}</p></div>)}
              </div>
              {detail.customerNote && <div><p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Note</p><p className="text-sm">{detail.customerNote}</p></div>}
              <div>
                <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">Produits</p>
                <div className="space-y-3">{(detail.items ?? []).map((item: any) => (
                  <div key={item.id ?? item.productId} className="flex items-center gap-3 border-b border-border/60 pb-3">
                    <button type="button" onClick={() => item.productImage && window.open(item.productImage, '_blank', 'noopener,noreferrer')} disabled={!item.productImage} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background disabled:cursor-default">
                      {item.productImage ? <img src={item.productImage} alt={item.productName} className="h-full w-full object-contain" /> : <ImageOff className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm">{item.productName} × {item.quantity}</p><p className="font-mono text-[10px] text-muted-foreground">SKU : {item.productSku}</p></div>
                    <p className="whitespace-nowrap text-sm font-medium text-primary">{money(item.totalPrice ?? Number(item.unitPrice) * item.quantity)}</p>
                  </div>
                ))}</div>
                <div className="mt-4 flex justify-between border-t border-border pt-4 font-medium"><span>Total réel</span><span className="text-primary">{money(detail.total ?? detail.totalAmount)}</span></div>
              </div>
              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <Button onClick={() => confirmPayment(detail)} className="bg-[#25D366] text-white hover:bg-[#20bd5a]"><MessageCircle className="mr-2 h-4 w-4" /> Paiement reçu · WhatsApp</Button>
                <Button variant="outline" onClick={() => updateStatus.mutate({ id: detail.id, status: 'preparing' })}>Mettre en préparation</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
