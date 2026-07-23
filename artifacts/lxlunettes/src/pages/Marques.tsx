import { Link } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { getBrandLogo } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Card3D } from '@/components/Card3D';
import { Skeleton } from '@/components/ui/skeleton';
import { InfiniteMarquee } from '@/components/InfiniteMarquee';

const ALL_BRANDS = [
  { name: 'MIU MIU', slug: 'miu-miu' },
  { name: 'CARTIER', slug: 'carter' },
  { name: 'CELINE', slug: 'celine' },
  { name: 'LOEWE', slug: 'loewe' },
  { name: 'STEPPER', slug: 'stepper' },
  { name: 'RAY-BAN', slug: 'ray-ban' },
  { name: 'CHANEL', slug: 'chanel' },
  { name: 'FENDI', slug: 'fendi' },
  { name: 'GUCCI', slug: 'gucci' },
  { name: 'SALVATORE FERRAGAMO', slug: 'salvatore-ferragam' },
  { name: 'CARRERA', slug: 'carrera' },
  { name: 'DOLCE & GABBANA', slug: 'dolce-gabbana' },
  { name: 'FERRARI', slug: 'ferrari' },
  { name: 'GIORGIO ARMANI', slug: 'giorgio-armani' },
  { name: 'PRADA', slug: 'prada' },
  { name: 'MONT BLANC', slug: 'mont-blanc' },
  { name: 'LOUIS VUITTON', slug: 'louis-vuitton' },
  { name: 'DIOR', slug: 'dior' },
  { name: 'MOSCOT', slug: 'moscot' },
  { name: 'OFF-WHITE', slug: 'off-white-tm' },
  { name: 'TIFFANY & Co.', slug: 'tiffany-co' },
  { name: 'SAINT LAURENT', slug: 'saint-laurent' },
  { name: 'DAVID BECKHAM', slug: 'eyewear-by-david-beckham' },
];

const COLOR_LOGOS = new Set(['FERRARI', 'PRADA', 'RAY-BAN', 'RAY.BAN', 'SAINT LAURENT', 'MONT BLANC']);
const brandTone = (name: string) => {
  const key = name.toUpperCase();
  if (key === 'FERRARI') return 'from-red-500/15 via-yellow-400/10 to-transparent';
  if (key === 'RAY-BAN' || key === 'RAY.BAN') return 'from-red-500/15 via-transparent to-transparent';
  if (['PRADA', 'SAINT LAURENT', 'MONT BLANC'].includes(key)) return 'from-amber-300/10 via-zinc-400/5 to-transparent';
  return 'from-primary/5 to-transparent';
};

export default function Marques() {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands-page'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  // Merge DB brands with fallback list
  const displayBrands = brands.length > 0
    ? brands
    : ALL_BRANDS.map((b, i) => ({ id: i, name: b.name, slug: b.slug, logo_url: null, description: '' }));

  return (
    <div className="w-full bg-background min-h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border py-12 md:py-20 mt-[-100px] pt-[150px]">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-serif text-foreground mb-6 tracking-widest uppercase">Nos Marques</h1>
          <div className="w-16 h-[1px] bg-primary mx-auto mb-6" />
          <p className="text-secondary max-w-2xl mx-auto font-light leading-relaxed">
            Découvrez les maisons les plus prestigieuses de la haute lunetterie. Chaque marque est sélectionnée pour son excellence et son savoir-faire.
          </p>
        </div>
      </div>

      {/* Infinite Marquee */}
      <div className="py-8 border-b border-border bg-card/50">
        <InfiniteMarquee speed={50} pauseOnHover gap={24}>
          {displayBrands.map((brand: any) => {
            const logoSvg = getBrandLogo(brand.name);
            const logoSource = brand.logo_url || (logoSvg ? `/images/brands/${logoSvg}` : null);
            const preserveColor = Boolean(brand.logo_url) || COLOR_LOGOS.has(brand.name.toUpperCase());
            return (
              <div key={brand.id} className="relative flex items-center justify-center min-w-[150px] h-[40px] px-6">
                {logoSource ? (
                  <img 
                    src={logoSource}
                    alt={brand.name} 
                    className={`w-full h-full object-contain opacity-60 hover:opacity-100 transition-opacity duration-300 ${preserveColor ? '' : 'logo-auto-color'}`}
                  />
                ) : (
                  <span className="text-xs font-serif text-muted-foreground/50 hover:text-foreground transition-colors tracking-[0.2em] uppercase whitespace-nowrap">
                    {brand.name}
                  </span>
                )}
              </div>
            );
          })}
        </InfiniteMarquee>
      </div>

      {/* Brands Grid */}
      <div className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(15)].map((_, i) => <Skeleton key={i} className="aspect-square bg-card rounded-sm" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayBrands.map((brand: any) => (
              <Card3D key={brand.id} className="group" intensity={10}>
                <Link
                  href={`/boutique?brand=${brand.slug}`}
                  className="block aspect-square rounded-sm border border-border bg-card hover:border-primary/40 transition-all duration-300 overflow-hidden relative"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${brandTone(brand.name)} opacity-60 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex flex-col items-center justify-center h-full px-4">
                    {(() => {
                      const logoSvg = getBrandLogo(brand.name);
                      const logoSource = brand.logo_url || (logoSvg ? `/images/brands/${logoSvg}` : null);
                      const preserveColor = Boolean(brand.logo_url) || COLOR_LOGOS.has(brand.name.toUpperCase());
                      return logoSource ? (
                        <>
                          <img
                            src={logoSource}
                            alt={brand.name}
                            className={`h-14 w-full object-contain opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 z-10 drop-shadow-lg ${preserveColor ? '' : 'logo-auto-color'}`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity duration-500 z-0 pointer-events-none">
                            <span className="text-4xl font-serif tracking-widest uppercase text-center text-foreground scale-150">
                              {brand.name}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-lg font-serif text-muted-foreground group-hover:text-foreground transition-colors tracking-[0.1em] uppercase text-center leading-tight">
                          {brand.name}
                        </span>
                      );
                    })()}
                    <div className="w-0 h-[1px] bg-primary transition-all duration-500 group-hover:w-12 mt-4 relative z-10" />
                    <span className="text-[10px] text-muted-foreground mt-3 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                      Voir la collection
                    </span>
                  </div>
                </Link>
              </Card3D>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 pb-16">
        <h2 className="text-2xl font-serif text-foreground mb-8 text-center">Par Catégorie</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Hommes', href: '/hommes', image: '/images/home/hommes/hero.png' },
            { title: 'Femmes', href: '/femmes', image: '/images/home/femmes/hero.png' },
            { title: 'Unisexe', href: '/unisexe', image: '/images/home/unisexe/hero.png' },
          ].map(cat => (
            <Link key={cat.title} href={cat.href} className="group relative h-[200px] overflow-hidden rounded-sm border border-border bg-card">
              <img src={cat.image} alt={cat.title} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="relative z-10 flex items-center justify-center h-full">
                <h3 className="text-2xl font-serif text-foreground tracking-[0.2em] uppercase">{cat.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
