import { Link, useLocation } from 'wouter';
import { ShoppingBag, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

export interface Product {
  id: string; name: string; slug: string; description?: string; shortDescription?: string;
  price: number; salePrice?: number | null; oldPrice?: number | null; discount?: number | null;
  brand?: string; category?: string; status?: string; sku?: string;
  brandId?: string; categoryId?: string; gender?: 'homme' | 'femme' | 'unisexe';
  primaryImage?: string; images?: { url: string }[];
  primary_image?: string;
  galleryUrls?: string | null; videoUrl?: string | null;
  featured?: boolean; newArrival?: boolean; bestSeller?: boolean; isNew?: boolean; stock?: number;
  fullDescription?: string; color?: string | null; frameMaterial?: string | null;
  shape?: string | null; lensType?: string | null; uvProtection?: string | null; dimensions?: string | null;
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id || null;
      setUserId(id);
      if (!id) return;
      const { data: saved } = await supabase.from('favorites').select('id').eq('clerk_user_id', id).eq('product_id', product.id).maybeSingle();
      setFavorite(!!saved);
    });
  }, [product.id]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.primaryImage || product.primary_image,
      quantity: 1,
      sku: product.sku || ''
    });
    toast({
      title: "Ajouté au panier",
      description: `${product.name} a été ajouté à votre panier.`,
    });
  };

  const handleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userId) {
      toast({ title: 'Connexion requise', description: 'Connectez-vous pour enregistrer vos favoris.' });
      setLocation('/sign-in');
      return;
    }
    setFavoriteLoading(true);
    try {
      if (favorite) {
        const { error } = await supabase.from('favorites').delete().eq('clerk_user_id', userId).eq('product_id', product.id);
        if (error) throw error;
        setFavorite(false);
      } else {
        const { error } = await supabase.from('favorites').insert({ clerk_user_id: userId, product_id: product.id });
        if (error) throw error;
        setFavorite(true);
      }
    } catch (error: any) {
      toast({ title: 'Favoris indisponibles', description: error.message || 'Réessayez dans quelques instants.', variant: 'destructive' });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const image = product.primaryImage || product.primary_image;

  return (
    <Link href={`/produits/${product.slug}`} className="group relative block overflow-hidden bg-card border border-border transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(201,168,76,0.1)] rounded-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-card to-muted/70 dark:from-[#111] dark:to-[#0b0b0b] p-6 flex items-center justify-center">
        {image ? (
          image.toLowerCase().endsWith('.mp4') || image.toLowerCase().endsWith('.webm') ? (
            <video 
              src={image} 
              autoPlay 
              muted 
              loop
              playsInline
              className="object-contain w-full h-full transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl" 
            />
          ) : (
            <img src={image} alt={product.name} className="object-contain w-full h-full transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm tracking-widest uppercase">Sans image</div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isNew && (
            <div className="bg-primary/90 text-primary-foreground text-[10px] uppercase tracking-widest px-2 py-1 shadow-md">Nouveau</div>
          )}
          {product.salePrice && (
            <div className="bg-destructive/90 text-destructive-foreground text-[10px] uppercase tracking-widest px-2 py-1 shadow-md">Promo</div>
          )}
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-[10px] text-secondary font-medium tracking-[0.2em] mb-2 uppercase">{product.brand}</h3>
        <h2 className="text-lg font-serif text-foreground truncate mb-3">{product.name}</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {product.salePrice ? (
              <>
                <span className="text-primary font-medium">{product.salePrice.toFixed(2)} MAD</span>
                <span className="text-muted-foreground line-through text-xs">{product.price.toFixed(2)} MAD</span>
              </>
            ) : (
              <span className="text-foreground font-medium">{product.price.toFixed(2)} MAD</span>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 flex gap-2">
        <Button size="icon" variant="outline" className={cn("h-10 w-10 rounded-full border-border bg-card/80 backdrop-blur hover:border-primary hover:text-primary", favorite && "border-primary text-primary")} onClick={handleFavorite} disabled={favoriteLoading} aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
          <Heart className={cn("w-4 h-4", favorite && "fill-current")} />
        </Button>
        <Button size="icon" className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg" onClick={handleAdd} disabled={product.stock !== undefined && product.stock <= 0}>
          <ShoppingBag className="w-4 h-4" />
        </Button>
      </div>
    </Link>
  );
}
