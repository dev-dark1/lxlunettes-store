import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Clock3, Copy, MessageCircle, PackageCheck, Trash2 } from 'lucide-react';

export default function ProfilPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [dismissedOrders, setDismissedOrders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lxlunettes_dismissed_orders') || '[]'); }
    catch { return []; }
  });
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      } else {
        setLocation('/sign-in');
      }
    });
  }, [setLocation]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const metadata = data.user?.user_metadata ?? {};
      const saved = metadata.checkout_profile ?? metadata;
      return {
        first_name: saved.first_name ?? saved.firstName ?? '',
        last_name: saved.last_name ?? saved.lastName ?? '',
        name: saved.name ?? saved.full_name ?? '',
        phone: saved.phone ?? '',
        city: saved.city ?? '',
        country: saved.country ?? 'Maroc',
        address: saved.address ?? '',
        is_whatsapp: saved.is_whatsapp ?? false,
        source: saved.source ?? '',
      };
    },
    enabled: !!user
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    country: 'Maroc',
    address: '',
    is_whatsapp: false,
    source: ''
  });

  const { data: orderData, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expirée');
      const response = await fetch('/api/orders/my?limit=50', { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Impossible de charger vos commandes');
      return payload;
    },
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  const pendingOrders = (orderData?.items ?? []).filter((order: any) =>
    !['paid', 'delivered', 'cancelled'].includes(order.status) && !dismissedOrders.includes(order.id),
  );

  const dismissOrder = (id: string) => {
    const next = [...new Set([...dismissedOrders, id])];
    setDismissedOrders(next);
    localStorage.setItem('lxlunettes_dismissed_orders', JSON.stringify(next));
  };

  const copyOrderNumber = async (orderNumber: string) => {
    await navigator.clipboard.writeText(orderNumber);
    toast({ title: 'Numéro copié', description: orderNumber });
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.first_name ? `${profile.first_name} ${profile.last_name}`.trim() : profile.name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        country: profile.country || 'Maroc',
        address: profile.address || '',
        is_whatsapp: profile.is_whatsapp || false,
        source: profile.source || ''
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const currentMetadata = user.user_metadata ?? {};
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          checkout_profile: {
            name: data.name,
            phone: data.phone,
            city: data.city,
            country: data.country,
            address: data.address,
            is_whatsapp: data.is_whatsapp,
            source: data.source,
          },
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLocation("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  if (!user || isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Skeleton className="h-12 w-64 bg-card mb-12" />
        <Skeleton className="h-[400px] w-full bg-card" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-serif text-foreground mb-12 tracking-widest uppercase">Mon Compte</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-card border border-border p-6 rounded-sm text-center">
            <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center text-2xl font-serif uppercase mx-auto mb-4">
              {user.email?.charAt(0)}
            </div>
            <h2 className="text-lg text-foreground font-medium mb-1 truncate">{user.email}</h2>
            <p className="text-muted-foreground text-xs mb-6">Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
            
            <Button 
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={handleSignOut}
            >
              Se déconnecter
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-card border border-border p-8 rounded-sm">
            <h3 className="text-xl font-serif text-foreground mb-6 uppercase tracking-widest">Mes Informations</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Nom Complet *</label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="bg-background border-border"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Téléphone *</label>
                  <Input 
                    required 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="bg-background border-border"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch 
                    id="is-whatsapp" 
                    checked={formData.is_whatsapp}
                    onCheckedChange={c => setFormData({...formData, is_whatsapp: c})}
                  />
                  <label htmlFor="is-whatsapp" className="text-sm font-medium leading-none text-muted-foreground">
                    Ce numéro est sur WhatsApp
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Ville *</label>
                  <Input 
                    required 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Pays *</label>
                  <Input 
                    required 
                    value={formData.country} 
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Adresse *</label>
                <Textarea 
                  required
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="bg-background border-border resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Comment nous avez-vous connus ?</label>
                <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Sélectionnez une option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="ai">Intelligence Artificielle (AI)</SelectItem>
                    <SelectItem value="friend">Ami / Recommandation</SelectItem>
                    <SelectItem value="social">Réseaux Sociaux</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                disabled={updateProfile.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground tracking-widest uppercase font-bold mt-4"
              >
                {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <section className="mt-10 bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <PackageCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-xl font-serif text-foreground uppercase tracking-widest">Mes commandes à valider</h3>
              <p className="text-xs text-muted-foreground mt-1">Le numéro disparaît automatiquement après validation du paiement par la boutique.</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {ordersLoading ? <Skeleton className="h-36" /> : pendingOrders.length === 0 ? (
            <div className="py-10 text-center">
              <Check className="w-9 h-9 text-emerald-500 mx-auto mb-3" />
              <p className="text-foreground">Aucune commande en attente</p>
              <p className="text-xs text-muted-foreground mt-1">Vos commandes payées ou terminées ne sont plus affichées ici.</p>
            </div>
          ) : pendingOrders.map((order: any) => {
            const isOlderThan24Hours = Date.now() - new Date(order.createdAt).getTime() >= 86_400_000;
            return (
              <article key={order.id} className="rounded-xl border border-border bg-background/50 p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base text-primary">{order.orderNumber}</span>
                      <span className="text-[10px] uppercase tracking-widest rounded-full bg-amber-500/15 text-amber-400 px-2 py-1">{order.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Clock3 className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <p className="text-xl font-serif text-primary">{Number(order.total ?? 0).toFixed(2)} MAD</p>
                </div>

                <div className="mt-4 space-y-2">
                  {(order.items ?? []).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm">
                      {item.productImage ? <img src={item.productImage} alt={item.productName} className="w-10 h-10 rounded-md object-cover border border-border" /> : <div className="w-10 h-10 rounded-md bg-muted" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate">{item.productName} × {item.quantity}</p>
                        <p className="text-xs text-muted-foreground">Code : {item.productSku}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyOrderNumber(order.orderNumber)} className="bg-transparent">
                    <Copy className="w-4 h-4 mr-2" /> Copier le numéro
                  </Button>
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {isOlderThan24Hours ? 'Relancer sur WhatsApp' : 'Valider via WhatsApp'}
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => dismissOrder(order.id)} className="text-muted-foreground ml-auto">
                    <Trash2 className="w-4 h-4 mr-2" /> Masquer
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
