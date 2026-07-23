import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Star, Check, X, Trash2, Plus, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUploadButton } from '@/components/FileUploadButton';

const STARS = (n: number) => Array.from({ length: 5 }, (_, i) => (
  <Star key={i} className={`w-3 h-3 ${i < n ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
));

export default function AdminReviews() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({
    customerName: '',
    photoUrl: '',
    rating: 5,
    title: '',
    comment: '',
    productId: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', statusFilter, page],
    queryFn: async () => (await adminApi.get('/api/reviews', { params: { status: statusFilter || undefined, page, limit: 15 } })).data,
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-for-reviews'],
    queryFn: async () => (await adminApi.get('/api/products', { params: { limit: 200 } })).data,
  });

  const approve = useMutation({
    mutationFn: async (id: string) => (await adminApi.patch(`/api/reviews/${id}/approve`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); toast({ title: 'Avis approuvé ✓' }); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => (await adminApi.patch(`/api/reviews/${id}/reject`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); toast({ title: 'Avis rejeté' }); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/api/reviews/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); setDeleteId(null); toast({ title: 'Avis supprimé' }); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const createReview = useMutation({
    mutationFn: async (d: typeof newReview) => {
      return (await adminApi.post('/api/reviews', { ...d, status: 'approved' })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast({ title: 'Avis ajouté avec succès ✓' });
      setIsModalOpen(false);
      setNewReview({ customerName: '', photoUrl: '', rating: 5, title: '', comment: '', productId: '' });
      setStatusFilter('approved'); // Switch to approved to see the new review
    },
    onError: (e: any) => {
      console.error(e);
      toast({ title: 'Erreur', description: 'Impossible de créer l\'avis', variant: 'destructive' });
    }
  });

  const reviews = data?.items ?? data ?? [];
  const products = productsData?.items ?? productsData ?? [];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground tracking-widest uppercase">Avis Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">{data?.total ?? reviews.length} avis</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un avis
        </Button>
      </div>

      <div className="flex gap-2">
        {[['', 'Tous'], ['pending', 'En attente'], ['approved', 'Approuvés'], ['rejected', 'Rejetés']].map(([v, l]) => (
          <Button key={v} variant={statusFilter === v ? 'default' : 'outline'} size="sm"
            className={statusFilter === v ? 'bg-primary text-primary-foreground uppercase tracking-widest text-[10px]' : 'border-border text-muted-foreground uppercase tracking-widest text-[10px] bg-transparent'}
            onClick={() => { setStatusFilter(v); setPage(1); }}>{l}</Button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 bg-card" />) :
         reviews.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground bg-card border border-border rounded-sm">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucun avis</p>
          </div>
        ) : reviews.map((r: any) => (
          <div key={r.id} className="bg-card border border-border rounded-sm p-5 flex gap-4">
            {r.photoUrl && (
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                <img src={r.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            )}
            {!r.photoUrl && (
              <div className="w-10 h-10 rounded-full shrink-0 bg-muted flex items-center justify-center text-muted-foreground">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex">{STARS(r.rating ?? 0)}</div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">par {r.customerName ?? 'Anonyme'}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : ''}</span>
              </div>
              {r.title && <p className="text-foreground font-medium text-sm mb-1">{r.title}</p>}
              <p className="text-muted-foreground text-sm leading-relaxed">{r.comment}</p>
              <p className="text-[11px] text-primary/70 mt-2">Produit: {r.productName ?? r.productId}</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {r.status !== 'approved' && (
                <button onClick={() => approve.mutate(r.id)} disabled={approve.isPending}
                  className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-sm transition-colors" title="Approuver"><Check className="w-4 h-4" /></button>
              )}
              {r.status !== 'rejected' && (
                <button onClick={() => reject.mutate(r.id)} disabled={reject.isPending}
                  className="p-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-sm transition-colors" title="Rejeter"><X className="w-4 h-4" /></button>
              )}
              <button onClick={() => setDeleteId(r.id)}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-sm transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-border bg-transparent text-muted-foreground">Précédent</Button>
          <span className="text-xs text-muted-foreground">{page} / {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)} className="border-border bg-transparent text-muted-foreground">Suivant</Button>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm p-6 max-w-sm w-full text-center">
            <Trash2 className="w-8 h-8 text-destructive mx-auto mb-4" />
            <h3 className="text-foreground font-medium mb-2">Supprimer cet avis ?</h3>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-muted-foreground">Annuler</Button>
              <Button onClick={() => remove.mutate(deleteId!)} disabled={remove.isPending} variant="destructive" className="uppercase tracking-widest text-xs">Supprimer</Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE REVIEW MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-foreground">Ajouter un avis manuel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nom du client *</label>
                <Input 
                  value={newReview.customerName} 
                  onChange={e => setNewReview({...newReview, customerName: e.target.value})} 
                  placeholder="Ex: Jean Dupont"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Note sur 5 *</label>
                <Select value={newReview.rating.toString()} onValueChange={v => setNewReview({...newReview, rating: parseInt(v)})}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Sélectionnez une note" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} Étoiles</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground block">Photo (Optionnel)</label>
              <FileUploadButton
                accept="image/*"
                label="Choisir une photo"
                onUploaded={(url) => setNewReview({ ...newReview, photoUrl: url })}
              />
              {newReview.photoUrl && (
                <img src={newReview.photoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover mt-2 border border-border" />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Produit concerné (Optionnel)</label>
              <Select value={newReview.productId} onValueChange={v => setNewReview({...newReview, productId: v})}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun (Avis général)</SelectItem>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Titre de l'avis (Optionnel)</label>
              <Input 
                value={newReview.title} 
                onChange={e => setNewReview({...newReview, title: e.target.value})} 
                placeholder="Très satisfait"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Commentaire *</label>
              <Textarea 
                value={newReview.comment} 
                onChange={e => setNewReview({...newReview, comment: e.target.value})} 
                placeholder="Votre avis détaillé..."
                rows={4}
                className="bg-background border-border text-foreground resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button 
              onClick={() => createReview.mutate({...newReview, productId: newReview.productId === 'none' ? '' : newReview.productId})} 
              disabled={createReview.isPending || !newReview.customerName || !newReview.comment}
            >
              Ajouter l'avis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
