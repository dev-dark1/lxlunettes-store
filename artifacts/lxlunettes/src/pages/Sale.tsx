import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { ProductCard, Product } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { normalizeProduct } from '@/lib/productMapper';
import { useLocation } from 'wouter';
import { LXLogo } from '@/components/LXLogo';

export default function Sale() {
  const [location, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("popular");
  const [brand, setBrand] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['sale-products', page, sortBy, brand],
    queryFn: async () => {
      let query = supabase.from('products').select('*, brands(name, slug), categories(name, slug)', { count: 'exact' })
        .eq('status', 'active')
        .is('deleted_at', null)
        .not('sale_price', 'is', null);
      
      if (brand && brand !== "none") {
        query = query.eq('brand_id', brand);
      }

      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'price_asc') query = query.order('sale_price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('sale_price', { ascending: false });
      else query = query.order('name', { ascending: true });
      
      const limit = 12;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      
      return {
        items: (data || []).map(normalizeProduct),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      };
    }
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').eq('is_active', true).order('name');
      return data || [];
    }
  });

  useEffect(() => {
    if (!brandsData) return;
    const value = new URLSearchParams(window.location.search).get('brand');
    const selected = brandsData.find((item: any) => item.id === value || item.slug === value);
    setBrand(selected?.id ?? '');
    setPage(1);
  }, [brandsData, location]);

  const changeBrand = (value: string) => {
    const id = value === 'none' ? '' : value;
    setBrand(id);
    setPage(1);
    const selected = brandsData?.find((item: any) => item.id === id);
    setLocation(selected ? `/sale?brand=${encodeURIComponent(selected.slug)}` : '/sale');
  };

  return (
    <div className="w-full bg-background min-h-screen">
      {/* HEADER */}
      <div className="bg-card border-b border-border py-12 md:py-20 mt-[-100px] pt-[150px]">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-7 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <LXLogo compact />
            <span className="hidden h-10 w-px bg-border sm:block" />
            <span className="font-serif text-4xl uppercase tracking-[0.3em] text-red-500 md:text-6xl">Sale</span>
          </div>
          <h1 className="mb-6 font-serif text-xl uppercase tracking-[0.28em] text-foreground md:text-2xl">Soldes exclusives</h1>
          <div className="w-16 h-[1px] bg-red-500 mx-auto mb-6" />
          <p className="text-secondary max-w-2xl mx-auto font-light leading-relaxed">
            Profitez de nos offres exceptionnelles sur une sélection de montures de luxe. L'élégance n'a jamais été aussi accessible.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-border pb-6">
          
          <Button variant="outline" className="border-border bg-card md:hidden" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" /> Filtres
          </Button>

          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="uppercase tracking-widest text-[10px]">Filtrer:</span>
            </div>
            
            <Select value={brand || "none"} onValueChange={changeBrand}>
              <SelectTrigger className="w-[180px] bg-card border-border text-xs rounded-sm">
                <SelectValue placeholder="Toutes les marques" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-sm max-h-[300px]">
                <SelectItem value="none">Toutes les marques</SelectItem>
                {(brandsData || []).map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-4 text-[10px] tracking-widest text-muted-foreground uppercase flex items-center h-full pt-1">
              {productsData?.total || 0} Pièces en promotion
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">Trier par:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-card border-border text-xs rounded-sm focus:ring-red-500/50">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-sm">
                <SelectItem value="popular">Plus populaires</SelectItem>
                <SelectItem value="newest">Nouveautés</SelectItem>
                <SelectItem value="price_asc">Prix croissant</SelectItem>
                <SelectItem value="price_desc">Prix décroissant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Filters Dropdown */}
        {showFilters && (
          <div className="mb-8 p-4 bg-card border border-border md:hidden grid gap-4">
             <div className="space-y-2">
               <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Marque</div>
               <Select value={brand || "none"} onValueChange={changeBrand}>
                 <SelectTrigger className="w-full bg-background border-border text-xs rounded-sm">
                   <SelectValue placeholder="Toutes les marques" />
                 </SelectTrigger>
                 <SelectContent className="bg-background border-border rounded-sm max-h-[250px]">
                   <SelectItem value="none">Toutes les marques</SelectItem>
                   {(brandsData || []).map(b => (
                     <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div className="text-[10px] tracking-widest text-muted-foreground uppercase pt-2 border-t border-border">
               {productsData?.total || 0} Pièces en promotion
             </div>
          </div>
        )}

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="aspect-[3/4] w-full bg-card rounded-sm" />)}
          </div>
        ) : productsData?.items.length === 0 ? (
          <div className="text-center py-32 bg-card border border-border rounded-sm">
            <p className="text-muted-foreground text-lg font-serif">Aucun produit en promotion pour le moment avec ces critères.</p>
            <Button variant="outline" className="mt-6 border-red-500 text-red-500" onClick={() => { setBrand(""); setSortBy("popular"); }}>Réinitialiser les filtres</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productsData?.items.map((p: Product) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Pagination */}
            {productsData && productsData.totalPages > 1 && (
              <div className="flex justify-center mt-16 gap-2">
                <Button 
                  variant="outline" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                  className="bg-card border-border hover:bg-muted"
                >
                  Précédent
                </Button>
                <div className="flex items-center px-4 font-serif text-muted-foreground">
                  Page {page} sur {productsData.totalPages}
                </div>
                <Button 
                  variant="outline" 
                  disabled={page === productsData.totalPages} 
                  onClick={() => setPage(p => p + 1)}
                  className="bg-card border-border hover:bg-muted"
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
