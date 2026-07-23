import { Link, useLocation } from 'wouter';
import { LXLogo } from './LXLogo';
import { ShoppingBag, Heart, User, Menu, Search, X, LayoutDashboard, ChevronDown, Moon, Sun } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FaFacebookF, FaInstagram, FaPinterestP, FaSnapchat, FaThreads, FaTiktok } from 'react-icons/fa6';

// Brand preview data for mega-dropdown
const FALLBACK_BRANDS = [
  { name: 'PRADA', slug: 'prada' },
  { name: 'GUCCI', slug: 'gucci' },
  { name: 'DIOR', slug: 'dior' },
  { name: 'CHANEL', slug: 'chanel' },
  { name: 'CELINE', slug: 'celine' },
  { name: 'CARTIER', slug: 'carter' },
  { name: 'SAINT LAURENT', slug: 'saint-laurent' },
  { name: 'FENDI', slug: 'fendi' },
];

const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', icon: FaFacebookF },
  { key: 'instagram', label: 'Instagram', icon: FaInstagram },
  { key: 'pinterest', label: 'Pinterest', icon: FaPinterestP },
  { key: 'threads', label: 'Threads', icon: FaThreads },
  { key: 'tiktok', label: 'TikTok', icon: FaTiktok },
  { key: 'snapchat', label: 'Snapchat', icon: FaSnapchat },
] as const;

type SocialNetworkKey = (typeof SOCIAL_NETWORKS)[number]['key'];

interface MegaDropdownProps {
  type: 'hommes' | 'femmes' | 'unisexe';
  brands: { name: string; slug: string }[];
  onClose: () => void;
  onMouseEnter: () => void;
  isClosing: boolean;
}

function MegaDropdown({ type, brands, onClose, onMouseEnter, isClosing }: MegaDropdownProps) {
  const title = type === 'hommes' ? 'Collection Hommes' : type === 'femmes' ? 'Collection Femmes' : 'Collection Unisexe';

  return (
    <div
      className={cn(
        "absolute top-full left-0 w-full bg-background/98 backdrop-blur-xl border-b border-border shadow-2xl z-50",
        isClosing 
          ? "animate-out fade-out slide-out-to-top-2 duration-300 pointer-events-none fill-mode-forwards" 
          : "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onClose}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-primary font-serif text-lg mb-1">{title}</h3>
            <p className="text-muted-foreground text-xs mb-6">Découvrez nos marques exclusives</p>
            <div className="grid grid-cols-4 gap-3">
              {brands.slice(0, 12).map(brand => (
                <Link
                  key={brand.slug}
                  href={`/${type}?brand=${brand.slug}`}
                  className="group/card relative overflow-hidden rounded-sm border border-border bg-card p-4 hover:border-primary/50 transition-all duration-300"
                  style={{ perspective: '600px' }}
                >
                  <div className="transition-transform duration-300 group-hover/card:[transform:rotateY(5deg)_rotateX(-3deg)_scale(1.02)]"
                    style={{ transformStyle: 'preserve-3d' }}>
                    <p className="text-foreground text-xs font-medium tracking-[0.15em] uppercase">{brand.name}</p>
                    <p className="text-muted-foreground text-[10px] mt-1">Voir la collection →</p>
                  </div>
                  {/* 3D Glare */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
                </Link>
              ))}
            </div>
          </div>
          <div className="ml-8 w-[200px] shrink-0">
            <Link href={`/${type}`} className="block text-center">
              <div className="w-full aspect-[3/4] rounded-sm overflow-hidden bg-card border border-border mb-3">
                <img
                  src={`/images/home/${type}/hero.png`}
                  alt={title}
                  className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity"
                />
              </div>
              <span className="text-primary text-xs uppercase tracking-widest hover:underline">Voir tout →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [location] = useLocation();
  const [promoBanner, setPromoBanner] = useState<{ active: boolean, text: string }>({ active: false, text: '' });
  const [navigationBrands, setNavigationBrands] = useState(FALLBACK_BRANDS);
  const [socialLinks, setSocialLinks] = useState<Partial<Record<SocialNetworkKey, string>>>({});
  const [megaOpen, setMegaOpen] = useState<'hommes' | 'femmes' | 'unisexe' | null>(null);
  const [closingMega, setClosingMega] = useState<'hommes' | 'femmes' | 'unisexe' | null>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAnimationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdmin = typeof window !== 'undefined' && !!localStorage.getItem('lxlunettes_admin_token');

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      // Migrate every visitor once to the dark-first storefront. After that,
      // keep respecting an explicit light/dark choice across visits.
      if (!localStorage.getItem('lxlunettes-theme-v3')) return 'dark';
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
    localStorage.setItem('lxlunettes-theme-v3', '1');
  }, [theme]);

  const openMega = (type: 'hommes' | 'femmes' | 'unisexe') => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    if (closeAnimationTimeout.current) clearTimeout(closeAnimationTimeout.current);
    setClosingMega(null);
    setMegaOpen(type);
  };

  const closeMega = () => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    // Add a slight delay before triggering the close animation
    megaTimeout.current = setTimeout(() => {
      if (megaOpen) {
        setClosingMega(megaOpen);
        // Wait for the CSS animation to complete before removing from DOM
        closeAnimationTimeout.current = setTimeout(() => {
          setMegaOpen(null);
          setClosingMega(null);
        }, 300);
      }
    }, 150);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });

    // Fetch public storefront settings in one request.
    const publicSettingKeys = [
      'PROMO_BANNER_ACTIVE', 'PROMO_BANNER_TEXT',
      'SOCIAL_FACEBOOK_URL', 'SOCIAL_FACEBOOK_ACTIVE',
      'SOCIAL_INSTAGRAM_URL', 'SOCIAL_INSTAGRAM_ACTIVE',
      'SOCIAL_PINTEREST_URL', 'SOCIAL_PINTEREST_ACTIVE',
      'SOCIAL_THREADS_URL', 'SOCIAL_THREADS_ACTIVE',
      'SOCIAL_TIKTOK_URL', 'SOCIAL_TIKTOK_ACTIVE',
      'SOCIAL_SNAPCHAT_URL', 'SOCIAL_SNAPCHAT_ACTIVE',
    ];
    supabase.from('settings').select('key,value').in('key', publicSettingKeys).then(({ data }) => {
      if (data) {
        const active = data.find(s => s.key === 'PROMO_BANNER_ACTIVE')?.value === 'true';
        const text = data.find(s => s.key === 'PROMO_BANNER_TEXT')?.value || '';
        setPromoBanner({ active, text });

        const values = Object.fromEntries(data.map((setting) => [setting.key, setting.value]));
        const nextLinks: Partial<Record<SocialNetworkKey, string>> = {};
        for (const network of SOCIAL_NETWORKS) {
          const prefix = `SOCIAL_${network.key.toUpperCase()}`;
          const url = values[`${prefix}_URL`]?.trim();
          if (url && values[`${prefix}_ACTIVE`] !== 'false') nextLinks[network.key] = url;
        }
        setSocialLinks(nextLinks);
      }
    });

    supabase.from('brands').select('name, slug').eq('is_active', true).order('name').then(({ data }) => {
      if (data?.length) setNavigationBrands(data);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileMenu(false);
    setMegaOpen(null);
  }, [location]);

  // Nav items with mega-dropdown capability
  const navLinks: { label: string; href: string; mega?: 'hommes' | 'femmes' | 'unisexe' }[] = [
    { label: 'Accueil', href: '/' },
    { label: 'Boutique', href: '/boutique' },
    { label: 'Hommes', href: '/hommes', mega: 'hommes' },
    { label: 'Femmes', href: '/femmes', mega: 'femmes' },
    { label: 'Unisexe', href: '/unisexe', mega: 'unisexe' },
    { label: 'Marques', href: '/marques' },
    { label: 'Sale', href: '/sale' },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary selection:text-black overflow-x-hidden w-full max-w-[100vw]">
      {/* Promo Banner */}
      {promoBanner.active && promoBanner.text && (
        <div className="w-full bg-primary text-primary-foreground text-center py-2 px-4 text-xs font-bold uppercase tracking-widest z-[60] relative">
          {promoBanner.text}
          <button
            onClick={() => setPromoBanner({ ...promoBanner, active: false })}
            className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className={cn("sticky top-0 w-full z-50 transition-all duration-500 border-b border-transparent", scrolled ? "bg-background/95 backdrop-blur-md border-border py-2 shadow-xl" : "bg-gradient-to-b from-background/80 to-transparent py-4")}>
        <div className="container mx-auto flex items-center justify-between px-2 sm:px-4">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-4 min-[900px]:hidden">
            <button onClick={() => setMobileMenu(true)} className="p-2 text-foreground hover:text-primary transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Desktop Nav */}
          <div className="relative hidden items-center gap-1.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.06em] min-[900px]:flex xl:gap-3 xl:text-xs xl:tracking-[0.1em]">
            {navLinks.map(link => (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() => link.mega && openMega(link.mega)}
                onMouseLeave={() => link.mega && closeMega()}
              >
                <Link href={link.href} className={cn(
                  "hover:text-primary transition-colors flex items-center gap-1 py-2",
                  link.label === 'Sale' && 'text-red-400 hover:text-red-300'
                )}>
                  {link.label}
                  {link.mega && <ChevronDown className="w-3 h-3 opacity-50" />}
                </Link>
              </div>
            ))}
          </div>

          {/* Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 cursor-pointer min-[900px]:hidden xl:block">
            <LXLogo compact={scrolled} className={scrolled ? "scale-90" : "scale-100"} />
          </Link>

          {/* Right icons */}
          <div className="flex items-center gap-0.5 sm:gap-2 xl:gap-3">
            <button onClick={toggleTheme} className="p-2 hover:text-primary transition-colors text-foreground">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button className="hidden md:flex p-2 hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>

            <Link
              href={isSignedIn ? "/profil" : "/sign-in"}
              className="hidden whitespace-nowrap md:flex items-center gap-1.5 px-2 min-[1100px]:px-3 py-1.5 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-[10px] uppercase tracking-widest font-bold"
            >
              <User className="w-3.5 h-3.5" />
              {isSignedIn ? "Mon compte" : "Se connecter"}
            </Link>

            <Link
              href={isAdmin ? "/admin" : "/admin/login"}
              className="hidden whitespace-nowrap md:flex items-center gap-1.5 px-2 min-[1100px]:px-3 py-1.5 rounded-sm border border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground transition-all text-[10px] uppercase tracking-widest font-bold"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Admin
            </Link>

            <Link href={isSignedIn ? "/profil" : "/sign-in"} className="p-2 hover:text-primary transition-colors md:hidden">
              <User className="w-5 h-5" />
            </Link>

            <Link href="/favoris" className="hidden md:flex p-2 hover:text-primary transition-colors relative">
              <Heart className="w-5 h-5" />
            </Link>
            <Link href="/panier" className="p-2 hover:text-primary transition-colors relative">
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center translate-x-1 -translate-y-1">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mega Dropdown */}
        {(megaOpen || closingMega) && (
          <MegaDropdown 
            type={megaOpen || closingMega!} 
            brands={navigationBrands}
            onClose={closeMega} 
            onMouseEnter={() => megaOpen && openMega(megaOpen)}
            isClosing={!!closingMega}
          />
        )}
      </header>

      {/* Mobile Menu */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background/98 p-4 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 sm:p-6">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <LXLogo compact />
            <button onClick={() => setMobileMenu(false)} className="p-2 text-foreground">
              <X className="w-8 h-8" />
            </button>
          </div>
          <nav className="mt-6 flex flex-col gap-4 pb-6 text-center font-serif text-xl sm:mt-12 sm:gap-6 sm:text-2xl">
            <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
            <Link href="/boutique" className="hover:text-primary transition-colors">Boutique</Link>
            <Link href="/hommes" className="hover:text-primary transition-colors">Hommes</Link>
            <Link href="/femmes" className="hover:text-primary transition-colors">Femmes</Link>
            <Link href="/unisexe" className="hover:text-primary transition-colors">Unisexe</Link>
            <Link href="/marques" className="hover:text-primary transition-colors">Marques</Link>
            <Link href="/sale" className="hover:text-primary text-red-400 transition-colors">Sale</Link>
            <Link href="/a-propos" className="hover:text-primary transition-colors">À propos</Link>
            <Link href="/nouveautes" className="hover:text-primary transition-colors">Nouveautés</Link>
          </nav>
        </div>
      )}

      <main className="flex-grow pt-[100px]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border pt-20 pb-8 mt-20">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="inline-block mb-6"><LXLogo compact className="items-start" /></Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              L'élégance à portée de vue. Lunettes de luxe authentiques des plus grandes maisons parisiennes et internationales.
            </p>
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex items-center gap-2" aria-label="Réseaux sociaux">
                {SOCIAL_NETWORKS.map(({ key, label, icon: Icon }) => {
                  const href = socialLinks[key];
                  if (!href) return null;
                  return (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      title={label}
                      className="group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:text-primary hover:shadow-[0_10px_28px_hsl(var(--primary)/0.18)]"
                    >
                      <span className="absolute inset-0 translate-y-full bg-primary/10 transition-transform duration-300 group-hover:translate-y-0" />
                      <Icon className="relative z-10 h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-primary font-serif text-xl mb-6">Boutique</h4>
            <ul className="flex flex-col gap-3 text-muted-foreground text-sm">
              <li><Link href="/nouveautes" className="hover:text-foreground transition-colors">Nouveautés</Link></li>
              <li><Link href="/hommes" className="hover:text-foreground transition-colors">Hommes</Link></li>
              <li><Link href="/femmes" className="hover:text-foreground transition-colors">Femmes</Link></li>
              <li><Link href="/unisexe" className="hover:text-foreground transition-colors">Unisexe</Link></li>
              <li><Link href="/sale" className="hover:text-foreground text-red-400/70 transition-colors">Soldes</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary font-serif text-xl mb-6">Service Client</h4>
            <ul className="flex flex-col gap-3 text-muted-foreground text-sm">
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contactez-nous</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/livraison" className="hover:text-foreground transition-colors">Livraison</Link></li>
              <li><Link href="/retours" className="hover:text-foreground transition-colors">Retours</Link></li>
              <li><Link href="/a-propos" className="hover:text-foreground transition-colors">À propos</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary font-serif text-xl mb-6">Légal</h4>
            <ul className="flex flex-col gap-3 text-muted-foreground text-sm">
              <li><Link href="/cgv" className="hover:text-foreground transition-colors">Conditions Générales de Vente</Link></li>
              <li><Link href="/confidentialite" className="hover:text-foreground transition-colors">Politique de Confidentialité</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-foreground transition-colors">Mentions Légales</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} LXLunettes. Tous droits réservés.</p>
          <p className="mt-2 md:mt-0 italic text-center md:text-right">Les marques appartiennent à leurs propriétaires respectifs.<br />Tous les produits commercialisés sont authentiques.</p>
        </div>
      </footer>
    </div>
  );
}
