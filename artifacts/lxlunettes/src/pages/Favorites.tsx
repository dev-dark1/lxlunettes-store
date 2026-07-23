import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { normalizeProduct } from '@/lib/productMapper';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';

export default function FavoritesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      setAuthReady(true);
    });
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['favorite-products', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('product:products(*, brands(name), categories(name))')
        .eq('clerk_user_id', userId!);
      if (error) throw error;
      return (data || []).map((favorite: any) => favorite.product).filter(Boolean).map(normalizeProduct);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-card py-16 text-center">
        <Heart className="mx-auto mb-5 h-7 w-7 text-primary" />
        <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-primary">Votre sélection</p>
        <h1 className="font-serif text-4xl md:text-5xl">Mes favoris</h1>
      </section>
      <div className="container mx-auto px-4 py-14">
        {!authReady || isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : !userId ? (
          <EmptyState title="Connectez-vous pour retrouver vos favoris" text="Votre sélection sera disponible sur tous vos appareils."><Button asChild><Link href="/sign-in">Se connecter</Link></Button></EmptyState>
        ) : products.length === 0 ? (
          <EmptyState title="Votre sélection est vide" text="Ajoutez vos modèles préférés depuis une fiche produit."><Button asChild><Link href="/boutique">Découvrir la boutique</Link></Button></EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map((product: any) => <ProductCard key={product.id} product={product} />)}</div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl border border-border bg-card px-6 py-16 text-center"><Heart className="mx-auto mb-5 h-8 w-8 text-primary/60" /><h2 className="font-serif text-2xl">{title}</h2><p className="mx-auto mb-7 mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>{children}</div>;
}
