import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Clock3, Mail, Search, ShoppingBag, UserRound, Users, X } from 'lucide-react';

const money = (value: unknown) => `${Number(value ?? 0).toFixed(2)} MAD`;
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR') : '—';

export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: async () => (await adminApi.get('/api/admin/customers', {
      params: { page, limit: 15, search: search || undefined },
    })).data,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-customer', selectedId],
    queryFn: async () => (await adminApi.get(`/api/admin/customers/${selectedId}`)).data,
    enabled: Boolean(selectedId),
  });

  const customers = data?.items ?? [];
  const profile = detail?.profile;
  const orders = detail?.orders ?? [];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-serif text-foreground tracking-widest uppercase">Clients</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data?.total ?? 0} comptes enregistrés dans Supabase Auth
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          className="pl-9 bg-card border-border"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl shadow-black/10">
        <div className="mobile-scrollbar overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-background/50">
              <tr className="text-left">
                {['Client', 'Dernière connexion', 'Commandes', 'Total', 'Statut', ''].map((label) => (
                  <th key={label} className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? [...Array(4)].map((_, index) => (
                <tr key={index}><td colSpan={6} className="p-4"><Skeleton className="h-10" /></td></tr>
              )) : isError ? (
                <tr><td colSpan={6} className="py-12 text-center text-destructive">Impossible de charger les comptes Supabase.</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucun compte trouvé</td></tr>
              ) : customers.map((customer: any) => (
                <tr key={customer.id} className="border-b border-border/50 hover:bg-primary/[0.03] transition-colors">
                  <td className="px-4 py-4">
                    <button onClick={() => setSelectedId(customer.id)} className="flex items-center gap-3 text-left">
                      <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-serif">
                        {(customer.firstName || customer.email || '?').charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <span className="block text-foreground">{`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Client'}</span>
                        <span className="block text-xs text-muted-foreground">{customer.email}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{dateTime(customer.lastSignInAt)}</td>
                  <td className="px-4 py-4 text-foreground">{customer.orderCount ?? 0}</td>
                  <td className="px-4 py-4 text-primary font-medium">{money(customer.totalSpent)}</td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ${customer.status === 'banned' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {customer.status === 'banned' ? 'Bloqué' : 'Actif'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(customer.id)} className="bg-transparent">Détails</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-border">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-xs text-muted-foreground">{page} / {data.totalPages}</span>
            <Button variant="outline" size="icon" disabled={page === data.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary">Compte Supabase</p>
                <h2 className="font-serif text-2xl text-foreground mt-1">{profile ? (`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email) : 'Chargement...'}</h2>
              </div>
              <button onClick={() => setSelectedId(null)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(88vh-86px)] space-y-6">
              {detailLoading || !profile ? <Skeleton className="h-72" /> : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { icon: Mail, label: 'Email', value: profile.email },
                      { icon: UserRound, label: 'Téléphone', value: profile.phone || '—' },
                      { icon: Clock3, label: 'Dernière connexion', value: dateTime(profile.lastSignInAt) },
                      { icon: ShoppingBag, label: 'Commandes / total', value: `${profile.orderCount ?? 0} · ${money(profile.totalSpent)}` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="rounded-xl border border-border bg-background/50 p-4">
                        <Icon className="w-4 h-4 text-primary mb-2" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className="text-sm text-foreground mt-1 break-all">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="font-serif text-lg text-foreground mb-3">Historique des commandes</h3>
                    <div className="space-y-2">
                      {orders.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border py-8 text-center text-muted-foreground text-sm">Aucune commande liée à ce compte.</div>
                      ) : orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
                          <div>
                            <p className="font-mono text-sm text-foreground">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground mt-1">{dateTime(order.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-primary font-medium">{money(order.total)}</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{order.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
