import { Link } from 'wouter';
import { cn, getBrandLogo } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { ProductCard } from '@/components/ProductCard';
import { Card3D } from '@/components/Card3D';
import { InfiniteMarquee } from '@/components/InfiniteMarquee';
import { ReviewCarousel } from '@/components/ReviewCarousel';
import { HeroSlideshow } from '@/components/HeroSlideshow';
import { VideoStories } from '@/components/VideoStories';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ShieldCheck, Truck, HeadphonesIcon, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { normalizeProduct } from '@/lib/productMapper';

// ─── Brand list for infinite marquee ────────────────────────────────────────────
const ALL_BRANDS = [
  'MIU MIU', 'CARTIER', 'CELINE', 'LOEWE', 'STEPPER', 'RAY-BAN', 'CHANEL',
  'FENDI', 'GUCCI', 'SALVATORE FERRAGAMO', 'CARRERA', 'DOLCE & GABBANA',
  'FERRARI', 'GIORGIO ARMANI', 'PRADA', 'MONT BLANC', 'LOUIS VUITTON',
  'DIOR', 'MOSCOT', 'OFF-WHITE', 'TIFFANY & Co.', 'SAINT LAURENT',
  'DAVID BECKHAM',
];

// ─── Category data with hover brands ────────────────────────────────────────────
const CATEGORIES = [
  {
    title: 'Hommes',
    link: '/hommes',
    image: '/images/home/hommes/hero.png',
    brands: ['PRADA', 'CARTIER', 'CELINE', 'GUCCI'],
    gradient: 'from-blue-900/40',
    slideshow: { basePath: '/images/home/hommes/hero', count: 14 },
  },
  {
    title: 'Femmes',
    link: '/femmes',
    image: '/images/home/femmes/hero.png',
    brands: ['DIOR', 'CHANEL', 'MIU MIU', 'FENDI'],
    gradient: 'from-rose-900/40',
    slideshow: { basePath: '/images/home/femmes/hero', count: 7 },
  },
  {
    title: 'Unisexe',
    link: '/unisexe',
    image: '/images/home/unisexe/hero.png',
    brands: ['RAY-BAN', 'SAINT LAURENT', 'GUCCI'],
    gradient: 'from-violet-900/40',
    slideshow: { basePath: '/images/home/unisexe/hero', count: 8 },
  },
  {
    title: 'Sale',
    link: '/sale',
    image: '/images/home/sale/hero.png',
    brands: ['Jusqu\'à -50%'],
    gradient: 'from-red-900/40',
  },
  {
    title: 'Boutique',
    link: '/boutique',
    image: '/images/home/boutique/hero.png',
    brands: ['Toute la collection'],
    gradient: 'from-amber-900/40',
  },
  {
    title: 'Marques',
    link: '/marques',
    image: '/images/home/marques/hero.png',
    brands: ['25 Maisons de Luxe'],
    gradient: 'from-emerald-900/40',
  },
];

// ─── Story Shop Section ─────────────────────────────────────────────────────────
function StoryShopSection() {
  const { data: stories = [] } = useQuery({
    queryKey: ['story-shop'],
    queryFn: async () => {
      const response = await fetch('/api/media/published');
      if (!response.ok) throw new Error('Impossible de charger les médias publiés.');
      const media = await response.json();
      return (Array.isArray(media) ? media : [])
        .filter((item: any) => item.featuredType === 'story' || item.folder === 'stories')
        .slice(0, 8);
    },
    staleTime: 60_000,
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').eq('is_active', true).order('name');
      return data || [];
    }
  });

  if (stories.length === 0) return null;

  return (
    <section className="py-24 bg-background border-t border-border overflow-hidden">
      <div className="container mx-auto px-4 mb-12">
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-medium">Story Shop</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground">Notre Univers</h2>
          </div>
          <p className="text-muted-foreground text-sm">Explorez nos dernières histoires et inspirations</p>
        </div>
      </div>

      {/* Horizontal scroll with 3D cards */}
      <div className="overflow-x-auto scrollbar-none mb-12">
        <div className="flex gap-6 px-[max(1rem,calc((100%-1280px)/2))] pb-4" style={{ width: 'max-content' }}>
          {stories.map((story: any, i: number) => (
            <Card3D key={story.id || i} className="group shrink-0 w-[300px] h-[400px]" intensity={10}>
              <div className="relative w-full h-full rounded-sm overflow-hidden border border-border bg-card">
                {story.type === 'video' ? (
                  <video src={story.url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                ) : (
                  <img src={story.url} alt={story.name || 'Story'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-foreground font-serif text-lg mb-1">{story.name || 'Collection'}</p>
                  {story.featuredType && (
                    <span className="text-[10px] uppercase tracking-widest text-primary">{story.featuredType}</span>
                  )}
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── MAIN HOME COMPONENT ────────────────────────────────────────────────────────
export default function Home() {
  const { data: featuredProducts, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, brands(name), categories(name)').eq('is_featured', true).eq('status', 'active').is('deleted_at', null).limit(4);
      return (data || []).map(normalizeProduct);
    }
  });

  const { data: newArrivals, isLoading: loadingNew } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, brands(name), categories(name)').eq('is_new', true).eq('status', 'active').is('deleted_at', null).limit(4);
      return (data || []).map(normalizeProduct);
    }
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await supabase.from('brands').select('*').eq('is_active', true).order('name');
      return data || [];
    }
  });

  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  return (
    <div className="w-full">
      {/* ═══ HERO SECTION ═══ */}
      <section className="relative h-[88vh] min-h-[640px] mt-[-100px] flex items-center overflow-hidden border-b border-border">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/home/hero-luxury-campaign.png"
            alt="Femme et homme portant des lunettes dans une campagne éditoriale de luxe"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/78 via-stone-950/38 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/45 via-transparent to-stone-950/20" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-5 md:px-8 mt-14">
          <div className="max-w-3xl text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.32em] text-white/90 backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#f1dca3]" /> Campagne 2026
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-[5.75rem] font-serif text-white mb-6 leading-[0.93] tracking-wide drop-shadow-2xl"
            style={{ textShadow: '0 8px 40px rgba(0,0,0,0.35)' }}
          >
            L'Élégance à <span className="text-[#f1dca3] italic">Portée de Vue</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-base md:text-lg text-white/80 max-w-xl mb-10 font-light tracking-wide leading-relaxed"
          >
            Découvrez notre collection exclusive de lunettes de soleil des plus prestigieuses maisons de luxe.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button asChild size="lg" className="bg-[#c7a552] hover:bg-[#d6b766] text-stone-950 text-xs px-9 py-7 rounded-sm tracking-[0.2em] uppercase font-semibold shadow-[0_16px_38px_rgba(0,0,0,0.22)]">
              <Link href="/boutique">Découvrir la collection</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/45 text-white hover:text-white hover:border-white hover:bg-white/10 text-xs px-9 py-7 rounded-sm tracking-[0.2em] uppercase font-medium bg-black/10 backdrop-blur-md">
              <Link href="/marques">Nos Marques</Link>
            </Button>
          </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ 3D CATEGORY GRID ═══ */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Collections Exclusives</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <Card3D key={cat.title} className="group h-[400px]" intensity={12}>
                <Link
                  href={cat.link}
                  className="relative block w-full h-full overflow-hidden rounded-sm border border-border bg-card"
                  onMouseEnter={() => setHoveredCat(cat.title)}
                  onMouseLeave={() => setHoveredCat(null)}
                >
                  {/* Background image / slideshow */}
                  {cat.slideshow ? (
                    <HeroSlideshow
                      basePath={cat.slideshow.basePath}
                      count={cat.slideshow.count}
                      interval={10000}
                      className="opacity-40 grayscale-[30%] group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-700"
                    />
                  ) : (
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-40 grayscale-[30%] group-hover:grayscale-0 group-hover:opacity-60"
                    />
                  )}

                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} via-background/50 to-transparent transition-opacity`} />

                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
                    <h3 className="text-3xl font-serif text-foreground tracking-[0.2em] uppercase mb-3 drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-2"
                      style={{ transform: hoveredCat === cat.title ? 'translateZ(40px)' : 'translateZ(0)', transformStyle: 'preserve-3d' }}>
                      {cat.title}
                    </h3>

                    {/* Gold line expander */}
                    <div className="w-0 h-[1px] bg-primary transition-all duration-500 group-hover:w-24 mb-4" />

                    {/* Brand names on hover */}
                    <div className={`flex flex-wrap items-center justify-center gap-2 transition-all duration-500 ${hoveredCat === cat.title ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                      {cat.brands.map(b => (
                        <span key={b} className="text-[10px] uppercase tracking-widest text-foreground/80 bg-foreground/10 backdrop-blur-sm px-3 py-1 rounded-sm border border-foreground/10">
                          {b}
                        </span>
                      ))}
                    </div>

                    {/* CTA arrow */}
                    <div className={`mt-4 transition-all duration-500 ${hoveredCat === cat.title ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                      <ArrowRight className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </Link>
              </Card3D>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INFINITE BRAND MARQUEE ═══ */}
      <section className="py-16 bg-card border-y border-border overflow-hidden">
        <div className="container mx-auto px-4 mb-8 text-center">
          <h2 className="text-sm font-medium tracking-[0.3em] text-secondary uppercase">Nos Maisons de Confiance</h2>
        </div>
        <InfiniteMarquee speed={35} pauseOnHover gap={32}>
          {brandsData?.map((brand: any) => {
            const logoSvg = getBrandLogo(brand.name);
            const logoSource = brand.logo_url || (logoSvg ? `/images/brands/${logoSvg}` : null);
            const preserveColor = Boolean(brand.logo_url) || ['FERRARI', 'PRADA', 'RAY-BAN', 'RAY.BAN', 'SAINT LAURENT', 'MONT BLANC'].includes(brand.name.toUpperCase());
            return (
              <Link
                key={brand.id}
                href={`/boutique?brand=${brand.slug}`}
                className="group relative flex items-center justify-center min-w-[200px] h-[60px] px-8 py-4 border border-border/50 bg-background/50 backdrop-blur-sm rounded-sm hover:border-primary/50 transition-colors cursor-pointer overflow-hidden"
              >
                {logoSource ? (
                  <>
                    <img 
                      src={logoSource}
                      alt={brand.name} 
                      className={`w-full h-full max-h-[40px] object-contain transition-all duration-500 opacity-70 group-hover:opacity-20 group-hover:scale-105 ${preserveColor ? '' : 'logo-auto-color'}`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <span className="text-xl font-serif text-foreground tracking-widest uppercase text-center">
                        {brand.name}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-xl font-serif text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-[0.2em] text-center">
                    {brand.name}
                  </span>
                )}
              </Link>
            );
          })}
        </InfiniteMarquee>
      </section>

      {/* ═══ VIDEO STORIES (Promotions) ═══ */}
      <VideoStories />

      {/* ═══ FEATURED PRODUCTS ═══ */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif mb-6 text-foreground">Pièces d'Exception</h2>
            <div className="w-12 h-[2px] bg-primary" />
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/4] w-full bg-muted rounded-sm" />)}
            </div>
          ) : !Array.isArray(featuredProducts) || featuredProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Aucun produit vedette pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <Button asChild variant="link" className="text-primary hover:text-primary/80 tracking-[0.2em] uppercase text-xs">
              <Link href="/boutique">Voir toute la collection</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ NEW ARRIVALS ═══ */}
      <section className="py-24 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif mb-6 text-foreground">Dernières Arrivées</h2>
              <div className="w-12 h-[2px] bg-primary" />
            </div>
            <Link href="/nouveautes" className="text-xs tracking-[0.2em] uppercase text-secondary hover:text-primary transition-colors pb-2 border-b border-transparent hover:border-primary">
              Découvrir les nouveautés
            </Link>
          </div>

          {loadingNew ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/4] w-full bg-muted rounded-sm" />)}
            </div>
          ) : !Array.isArray(newArrivals) || newArrivals.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Aucune nouveauté pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ STORY SHOP ═══ */}
      <StoryShopSection />

      {/* ═══ CUSTOMER REVIEWS (3D Carousel) ═══ */}
      <ReviewCarousel />

      {/* ═══ PROMISES ═══ */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-6 text-primary border border-border group-hover:border-primary transition-colors">
                <ShieldCheck className="w-8 h-8 font-light" strokeWidth={1} />
              </div>
              <h3 className="text-sm font-medium tracking-[0.1em] uppercase mb-3 text-foreground">Authenticité Garantie</h3>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Produits certifiés avec numéro de série et certificat d'origine.</p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-6 text-primary border border-border group-hover:border-primary transition-colors">
                <Truck className="w-8 h-8 font-light" strokeWidth={1} />
              </div>
              <h3 className="text-sm font-medium tracking-[0.1em] uppercase mb-3 text-foreground">Livraison Sécurisée</h3>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Expédition express avec assurance et suivi en temps réel.</p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-6 text-primary border border-border group-hover:border-primary transition-colors">
                <HeadphonesIcon className="w-8 h-8 font-light" strokeWidth={1} />
              </div>
              <h3 className="text-sm font-medium tracking-[0.1em] uppercase mb-3 text-foreground">Service Conciergerie</h3>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Nos experts opticiens à votre disposition 7j/7.</p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-6 text-primary border border-border group-hover:border-primary transition-colors">
                <RefreshCw className="w-8 h-8 font-light" strokeWidth={1} />
              </div>
              <h3 className="text-sm font-medium tracking-[0.1em] uppercase mb-3 text-foreground">Retours Privilèges</h3>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">Essayez chez vous, retours simplifiés sous 14 jours.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
