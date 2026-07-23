import { Link, useLocation } from "wouter";
import { LXLogo } from "./LXLogo";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Bookmark, 
  Database, 
  ShoppingCart, 
  Users, 
  Star, 
  Percent, 
  LogOut,
  Store,
  Settings,
  ImageIcon,
  Share2,
  Menu,
  X
} from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [authState, setAuthState] = useState<'checking' | 'allowed'>('checking');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('lxlunettes_admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }

    adminApi.get('/api/admin/auth/me')
      .then(() => setAuthState('allowed'))
      .catch(() => {
        localStorage.removeItem('lxlunettes_admin_token');
        window.location.href = '/admin/login';
      });
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('lxlunettes_admin_token');
    window.location.href = '/admin/login';
  };

  const navGroups = [
    {
      label: 'Catalogue',
      items: [
        { label: "Vue d'ensemble", path: "/admin", icon: LayoutDashboard },
        { label: "Produits", path: "/admin/produits", icon: Package },
        { label: "Catégories", path: "/admin/categories", icon: Tags },
        { label: "Marques", path: "/admin/marques", icon: Bookmark },
        { label: "Stock", path: "/admin/stock", icon: Database },
      ]
    },
    {
      label: 'Ventes',
      items: [
        { label: "Commandes", path: "/admin/commandes", icon: ShoppingCart },
        { label: "Clients", path: "/admin/clients", icon: Users },
        { label: "Promotions", path: "/admin/promotions", icon: Percent },
      ]
    },
    {
      label: 'Contenu',
      items: [
        { label: "Médias", path: "/admin/medias", icon: ImageIcon },
        { label: "Avis", path: "/admin/avis", icon: Star },
        { label: "Réseaux sociaux", path: "/admin/parametres?section=social", icon: Share2 },
      ]
    },
    {
      label: 'Configuration',
      items: [
        { label: "Paramètres", path: "/admin/parametres", icon: Settings },
      ]
    },
  ];

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center">
        <div>
          <div className="w-9 h-9 rounded-full border border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Vérification de la session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] min-w-0 overflow-x-hidden bg-background text-foreground">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm min-[900px]:hidden"
          aria-label="Fermer le menu d'administration"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(18rem,86vw)] flex-col border-r border-border bg-card transition-transform duration-300 min-[900px]:w-64 min-[900px]:translate-x-0 ${
        mobileNavOpen ? 'visible translate-x-0 shadow-2xl' : 'invisible -translate-x-full min-[900px]:visible'
      }`}>
        <div className="relative h-20 flex shrink-0 items-center justify-center border-b border-border">
          <Link href="/admin"><LXLogo compact className="scale-75" /></Link>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground min-[900px]:hidden"
            aria-label="Fermer le menu d'administration"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-4 scrollbar-none">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/50 font-medium px-3 mb-1">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const socialSettingsOpen = typeof window !== 'undefined'
                    && new URLSearchParams(window.location.search).get('section') === 'social';
                  const isSocialItem = item.path.includes('section=social');
                  const isSettingsItem = item.path === '/admin/parametres';
                  const isActive = isSocialItem
                    ? location.startsWith('/admin/parametres') && socialSettingsOpen
                    : isSettingsItem
                      ? location.startsWith(item.path) && !socialSettingsOpen
                      : location === item.path || (item.path !== '/admin' && location.startsWith(item.path));
                  return (
                    <Link key={item.path} href={item.path}>
                      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'}`}>
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <Link href="/">
            <Button variant="outline" className="w-full justify-start border-border text-muted-foreground hover:text-primary hover:border-primary bg-transparent">
              <Store className="w-4 h-4 mr-2" /> Voir la boutique
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-h-[100dvh] min-w-0 flex-1 bg-background min-[900px]:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md min-[900px]:hidden">
          <button
            type="button"
            className="rounded-md border border-border p-2 text-foreground hover:border-primary hover:text-primary"
            aria-label="Ouvrir le menu d'administration"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/admin" aria-label="Accueil de l'administration">
            <LXLogo compact className="scale-75" />
          </Link>
          <div className="w-10" aria-hidden="true" />
        </header>
        <div className="p-4 sm:p-6 min-[900px]:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
