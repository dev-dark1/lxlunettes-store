import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/ProductCard';
import { normalizeProduct } from '@/lib/productMapper';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, ShoppingBag, Heart, ShieldCheck, RotateCcw, Truck, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const isVideoMedia = (url?: string | null) => {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg)(?:$|[?#])/i.test(url);
};

const parseGalleryUrls = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String).map((url) => url.trim()).filter(Boolean);
  }

  const raw = String(value).trim();
  if (!raw || raw === '[]' || raw === 'null') return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((url) => url.trim()).filter(Boolean);
    }
  } catch {
    // The dashboard stores manually entered gallery URLs one per line.
  }

  return raw.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
};

export default function ProductDetail({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [, setLocation] = useLocation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'desc' | 'carac' | 'livraison' | 'avis'>('desc');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);
  const queryClient = useQueryClient();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, brands(name), categories(name)').eq('slug', slug).single();
      if (error) throw error;
      const formatted: any = normalizeProduct(data);
      
      const images: any[] = [];
      if (formatted.primaryImage) images.push({ id: 'primary', url: formatted.primaryImage });
      const galleryUrls = data.gallery_urls ?? data.galleryUrls;
      parseGalleryUrls(galleryUrls).forEach((url, i) => {
        if (!images.some((image) => image.url === url)) {
          images.push({ id: `gallery-${i}`, url });
        }
      });
      if (formatted.videoUrl && !images.some((image) => image.url === formatted.videoUrl)) {
        images.push({ id: 'video', url: formatted.videoUrl, type: 'video' });
      }
      formatted.images = images;
      
      return formatted;
    },
    enabled: !!slug
  });

  const { data: reviews } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product?.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!product?.id
  });

  const submitReview = useMutation({
    mutationFn: async (payload: { rating: number, comment: string }) => {
      if (!user) throw new Error("Vous devez être connecté pour laisser un avis");
      const { error } = await supabase.from('reviews').insert({
        product_id: product.id,
        clerk_user_id: user.id,
        customer_name: user.user_metadata?.checkout_profile?.name || user.user_metadata?.name || user.email,
        rating: payload.rating,
        comment: payload.comment,
        status: 'pending'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Avis soumis", description: "Votre avis est en attente d'approbation." });
      setReviewComment("");
      setReviewRating(5);
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  });

  const { data: similarProducts } = useQuery({
    queryKey: ['similar-products', product?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, brands(name), categories(name)').neq('id', product?.id).eq('brand_id', product?.brandId).eq('status', 'active').limit(4);
      if (error) throw error;
      return (data || []).map(normalizeProduct);
    },
    enabled: !!product?.id
  });

  const { data: favorites } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites').select('*').eq('clerk_user_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const isFavorite = favorites?.some(f => f.product_id === product?.id);

  const addFav = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from('favorites').insert({ clerk_user_id: user.id, product_id: productId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] })
  });

  const removeFav = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from('favorites').delete().eq('clerk_user_id', user.id).eq('product_id', productId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] })
  });

  useEffect(() => {
    if (product) {
      setActiveImage(product.primaryImage || (product.images?.[0]?.url) || null);
      setQuantity(1);
      window.scrollTo(0,0);
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 lg:py-24 grid grid-cols-1 md:grid-cols-2 gap-12">
        <Skeleton className="aspect-square bg-card rounded-sm" />
        <div className="space-y-6">
          <Skeleton className="h-6 w-32 bg-card" />
          <Skeleton className="h-12 w-3/4 bg-card" />
          <Skeleton className="h-8 w-24 bg-card" />
          <Skeleton className="h-24 w-full bg-card" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl font-serif text-foreground mb-4">Produit Introuvable</h1>
        <p className="text-muted-foreground mb-8">Ce produit n'existe plus ou a été retiré de la vente.</p>
        <Button asChild variant="outline" className="border-primary text-primary">
          <Link href="/boutique">Retour à la boutique</Link>
        </Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.primaryImage,
      quantity,
      sku: product.sku
    });
    toast({
      title: "Ajouté au panier",
      description: `${quantity}x ${product.name} ajouté au panier.`,
    });
  };

  const handleToggleFav = () => {
    // Assuming auth check is needed, but we try anyway. Error handled via interceptor if 401
    if (isFavorite) {
      // Find fav ID
      // wait, removeFavorite takes id. We don't have favorite ID easily unless we match it.
      const fav = favorites?.find(f => f.product_id === product.id);
      if (fav) removeFav.mutate(product.id);
    } else {
      addFav.mutate(product.id);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      {/* BREADCRUMB */}
      <div className="container mx-auto px-4 py-6 border-b border-border mb-8 md:mb-12 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Link href="/" className="hover:text-foreground transition-colors">Accueil</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/boutique" className="hover:text-foreground transition-colors">Boutique</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary">{product.name}</span>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 mb-24">
          
          {/* IMAGE GALLERY */}
          <div className="flex flex-col-reverse md:flex-row gap-4">
            <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:w-24 shrink-0 scrollbar-none">
              {(product.images || []).map((img: any) => {
                const isVid = img.type === 'video' || isVideoMedia(img.url);
                return (
                  <button 
                    key={img.id} 
                    onClick={() => setActiveImage(img.url)}
                    className={`w-20 h-20 md:w-24 md:h-24 bg-card border flex items-center justify-center p-2 rounded-sm transition-all overflow-hidden ${activeImage === img.url ? 'border-primary shadow-[0_0_15px_rgba(201,168,76,0.3)]' : 'border-border opacity-60 hover:opacity-100'}`}
                  >
                    {isVid ? (
                      <video src={img.url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={img.url} alt={img.alt || product.name} className="w-full h-full object-contain" />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="relative flex-grow bg-gradient-to-br from-card to-muted/70 dark:from-[#111] dark:to-[#080808] border border-border flex items-center justify-center p-8 rounded-sm overflow-hidden aspect-square md:aspect-auto md:min-h-[600px] group shadow-[0_24px_70px_hsl(var(--foreground)/0.07)]">
              {activeImage ? (
                isVideoMedia(activeImage) || activeImage === product.videoUrl ? (
                  <video 
                    src={activeImage} 
                    controls 
                    autoPlay 
                    muted 
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img src={activeImage} alt={product.name} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-125 cursor-crosshair drop-shadow-2xl" />
                )
              ) : (
                <span className="text-muted-foreground font-serif text-xl tracking-widest uppercase">Sans image</span>
              )}
              {product.salePrice && (
                <div className="absolute top-6 right-6 bg-destructive text-destructive-foreground text-xs uppercase tracking-widest font-bold px-3 py-1.5 shadow-lg">Promo</div>
              )}
            </div>
          </div>
          
          {/* PRODUCT INFO */}
          <div className="flex flex-col py-4">
            <h2 className="text-sm font-medium tracking-[0.3em] uppercase text-secondary mb-4">{product.brand}</h2>
            <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-6 leading-tight">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              {product.salePrice ? (
                 <>
                   <span className="text-3xl text-primary font-medium">{product.salePrice.toFixed(2)} MAD</span>
                   <span className="text-muted-foreground line-through text-lg">{product.price.toFixed(2)} MAD</span>
                 </>
              ) : (
                <span className="text-3xl text-foreground font-medium">{product.price.toFixed(2)} MAD</span>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-8">
              {product.shortDescription}
            </p>
            
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">SKU: <span className="text-foreground">{product.sku}</span></div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Disponibilité: 
                {product.stock > 0 ? (
                  <span className="text-green-500 ml-2">En stock ({product.stock})</span>
                ) : (
                  <span className="text-destructive ml-2">Rupture de stock</span>
                )}
              </div>
            </div>
            
            <div className="flex gap-4 mb-10">
              <div className="flex items-center border border-border rounded-sm bg-card">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  disabled={product.stock <= 0}
                >-</button>
                <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  disabled={product.stock <= 0}
                >+</button>
              </div>
              
              <Button 
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-grow bg-primary hover:bg-primary/90 text-primary-foreground h-auto py-3 text-sm tracking-[0.1em] uppercase font-bold rounded-sm shadow-[0_0_20px_rgba(201,168,76,0.15)]"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {product.stock > 0 ? "Ajouter au panier" : "Indisponible"}
              </Button>
              
              <Button 
                onClick={handleToggleFav}
                variant="outline"
                className={`h-auto w-14 shrink-0 rounded-sm border-border bg-card hover:border-primary transition-colors ${isFavorite ? 'text-destructive border-destructive/50' : 'text-muted-foreground hover:text-primary'}`}
              >
                <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
              </Button>
            </div>
            
            {/* BENEFITS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
              <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-sm">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="text-xs tracking-wide uppercase text-foreground font-medium">Authentique Garantie</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-sm">
                <Truck className="w-5 h-5 text-primary" />
                <span className="text-xs tracking-wide uppercase text-foreground font-medium">Livraison Express</span>
              </div>
            </div>
            
          </div>
        </div>

        {/* TABS */}
        <div className="border-t border-border pt-16 mb-24 max-w-4xl mx-auto">
          <div className="flex justify-center gap-8 mb-12 border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none">
            {[
              { id: 'desc', label: 'Description' },
              { id: 'carac', label: 'Caractéristiques' },
              { id: 'livraison', label: 'Livraison & Retours' },
              { id: 'avis', label: `Avis (${reviews?.length || 0})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-xs md:text-sm tracking-[0.2em] uppercase transition-all relative ${activeTab === tab.id ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 w-full h-[2px] bg-primary" />
                )}
              </button>
            ))}
          </div>
          
          <div className="bg-card border border-border p-8 rounded-sm min-h-[300px]">
            <AnimatePresence mode="wait">
              {activeTab === 'desc' && (
                <motion.div 
                  key="desc"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="prose prose-invert prose-p:font-light prose-p:leading-relaxed prose-p:text-muted-foreground max-w-none font-serif text-lg"
                >
                  <div dangerouslySetInnerHTML={{ __html: product.fullDescription || product.shortDescription }} />
                </motion.div>
              )}
              {activeTab === 'carac' && (
                <motion.div 
                  key="carac"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12"
                >
                  {[
                    { label: "Marque", value: product.brand },
                    { label: "Couleur", value: product.color },
                    { label: "Matière", value: product.frameMaterial },
                    { label: "Forme", value: product.shape },
                    { label: "Type de verre", value: product.lensType },
                    { label: "Protection UV", value: product.uvProtection },
                    { label: "Dimensions", value: product.dimensions },
                  ].map(spec => (
                    <div key={spec.label} className="flex justify-between py-3 border-b border-border/50 text-sm">
                      <span className="text-muted-foreground tracking-wide">{spec.label}</span>
                      <span className="text-foreground text-right">{spec.value || '-'}</span>
                    </div>
                  ))}
                </motion.div>
              )}
              {activeTab === 'livraison' && (
                <motion.div 
                  key="livraison"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-8 text-sm font-light text-muted-foreground leading-relaxed"
                >
                  <div>
                    <h4 className="text-foreground font-serif text-xl mb-3 flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Expédition Internationale</h4>
                    <p>Vos commandes sont expédiées sous 24 à 48 heures ouvrées via nos transporteurs premium sécurisés (DHL Express, FedEx). Une assurance couvrant la valeur totale du produit est incluse.</p>
                  </div>
                  <div>
                    <h4 className="text-foreground font-serif text-xl mb-3 flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Politique de Retour</h4>
                    <p>Vous disposez de 14 jours à compter de la réception pour nous retourner l'article dans son emballage d'origine, scellé et non porté. Le remboursement est intégral après inspection par nos experts.</p>
                  </div>
                </motion.div>
              )}
              {activeTab === 'avis' && (
                <motion.div 
                  key="avis"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  {/* Reviews List */}
                  <div className="space-y-6">
                    <h3 className="text-2xl font-serif text-foreground mb-6">Avis Clients</h3>
                    {reviews && reviews.length > 0 ? (
                      reviews.map((r: any) => (
                        <div key={r.id} className="border-b border-border/50 pb-6 mb-6 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-serif uppercase shrink-0">
                                {r.customer_name?.charAt(0) || 'C'}
                              </div>
                              <span className="font-medium text-foreground">{r.customer_name || 'Client'}</span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed italic ml-11">
                            "{r.comment || r.text}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground italic text-sm">Aucun avis pour ce produit pour le moment. Soyez le premier !</p>
                    )}
                  </div>

                  {/* Submit Review */}
                  <div className="bg-muted/45 dark:bg-[#111] p-6 border border-border rounded-sm">
                    <h4 className="text-lg font-serif text-foreground mb-4 uppercase tracking-widest">Laissez un avis</h4>
                    {user ? (
                      <form onSubmit={e => { e.preventDefault(); submitReview.mutate({ rating: reviewRating, comment: reviewComment }); }} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest text-muted-foreground">Note</label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button key={s} type="button" onClick={() => setReviewRating(s)} className="focus:outline-none">
                                <Star className={`w-6 h-6 ${s <= reviewRating ? 'text-primary fill-primary' : 'text-muted-foreground hover:text-primary/50'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest text-muted-foreground">Votre Commentaire</label>
                          <Textarea 
                            required
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            placeholder="Partagez votre expérience..."
                            className="bg-background border-border resize-none"
                            rows={4}
                          />
                        </div>
                        <Button 
                          type="submit" 
                          disabled={submitReview.isPending}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground tracking-widest uppercase font-bold"
                        >
                          {submitReview.isPending ? 'Envoi...' : 'Soumettre'}
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground text-sm mb-4">Veuillez vous connecter pour laisser un avis sur ce produit.</p>
                        <Button asChild variant="outline" className="border-primary text-primary">
                          <Link href="/sign-in">Se connecter</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* SIMILAR PRODUCTS */}
        {similarProducts && similarProducts.length > 0 && (
          <div className="border-t border-border pt-24 mb-24">
            <h2 className="text-3xl font-serif text-foreground mb-12 text-center">Vous aimerez aussi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
