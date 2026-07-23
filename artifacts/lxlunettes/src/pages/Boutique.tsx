import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { normalizeProduct } from '@/lib/productMapper';

export default function Boutique({ type, newOnly = false }: { type?: 'homme' | 'femme' | 'unisexe'; newOnly?: boolean }) {
  const [location, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("popular");
  const [brand, setBrand] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [onSale, setOnSale] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', page, sortBy, brand, type, onSale, newOnly],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, brands(name, slug), categories(name, slug)', { count: 'exact' })
        .eq('status', 'active')
        .is('deleted_at', null);
      
      if (brand && brand !== "none") {
        query = query.eq('brand_id', brand);
      }
      if (onSale) {
        query = query.not('sale_price', 'is', null);
      }
      if (newOnly) {
        query = query.eq('is_new', true);
      }
      
      if (type) {
        query = query.eq('gender', type);
      }
      
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'price_asc') query = query.order('price', { ascending: true });
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false });
      else query = query.order('name', { ascending: true }); // popular fallback
      
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
    const query = selected ? `?brand=${encodeURIComponent(selected.slug)}` : '';
    setLocation(`${window.location.pathname}${query}`);
  };

  const title = newOnly ? 'Nouveautés' : type === 'homme' ? 'Hommes' : type === 'femme' ? 'Femmes' : type === 'unisexe' ? 'Unisexe' : 'Toute la Collection';

  return (
    <div className="w-full bg-background min-h-screen">
      {/* HEADER */}
      <div className="bg-card border-b border-border py-12 md:py-20 mt-[-100px] pt-[150px]">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-serif text-foreground mb-6 tracking-widest uppercase">{title}</h1>
          <div className="w-16 h-[1px] bg-primary mx-auto mb-6" />
          <p className="text-secondary max-w-2xl mx-auto font-light leading-relaxed">
            Explorez notre sélection exclusive. Chaque pièce est un chef-d'œuvre de design, offrant une protection optimale et une élégance intemporelle.
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

            <div className="flex items-center space-x-2 ml-2">
              <Switch id="onSale" checked={onSale} onCheckedChange={setOnSale} />
              <label htmlFor="onSale" className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer select-none">
                Promotions
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">Trier par:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-card border-border text-xs rounded-sm">
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
             
             <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
               <label htmlFor="onSaleMobile" className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer">
                 Promotions uniquement
               </label>
               <Switch id="onSaleMobile" checked={onSale} onCheckedChange={setOnSale} />
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
            <p className="text-muted-foreground text-lg font-serif">Aucun produit trouvé avec ces critères.</p>
            <Button variant="outline" className="mt-6 border-primary text-primary" onClick={() => { setBrand(""); setSortBy("popular"); }}>Réinitialiser les filtres</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productsData?.items.map(p => (
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
