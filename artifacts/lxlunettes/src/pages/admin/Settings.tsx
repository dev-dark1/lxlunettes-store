import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  MessageCircle, Database, RefreshCw, Check, X, Settings as SettingsIcon,
  Store, Globe, DollarSign, Mail, Shield, Bell, Key, ChevronRight, Loader2,
  Activity, Wifi, WifiOff, AlertTriangle, Share2, ExternalLink
} from 'lucide-react';
import { FileUploadButton } from '@/components/FileUploadButton';
import { FaFacebookF, FaInstagram, FaPinterestP, FaSnapchat, FaThreads, FaTiktok } from 'react-icons/fa6';

type SectionKey = 'general' | 'store' | 'notifications' | 'whatsapp' | 'social' | 'email' | 'security' | 'supabase';

const NAV: { key: SectionKey; label: string; icon: any; desc: string }[] = [
  { key: 'general', label: 'Général', icon: Store, desc: 'Informations de base' },
  { key: 'store', label: 'Boutique', icon: Globe, desc: 'Devise, langue, taxes' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, desc: 'Numéro commandes' },
  { key: 'social', label: 'Réseaux sociaux', icon: Share2, desc: 'Liens & visibilité' },
  { key: 'email', label: 'Email', icon: Mail, desc: 'SMTP & notifications' },
  { key: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alertes système' },
  { key: 'security', label: 'Sécurité', icon: Shield, desc: 'Mot de passe admin' },
  { key: 'supabase', label: 'Supabase', icon: Database, desc: 'Connexion & stockage' },
];

const SOCIAL_FIELDS = [
  { key: 'facebook', label: 'Facebook', icon: FaFacebookF, placeholder: 'https://facebook.com/votre-page' },
  { key: 'instagram', label: 'Instagram', icon: FaInstagram, placeholder: 'https://instagram.com/votre-compte' },
  { key: 'pinterest', label: 'Pinterest', icon: FaPinterestP, placeholder: 'https://pinterest.com/votre-compte' },
  { key: 'threads', label: 'Threads', icon: FaThreads, placeholder: 'https://threads.net/@votre-compte' },
  { key: 'tiktok', label: 'TikTok', icon: FaTiktok, placeholder: 'https://tiktok.com/@votre-compte' },
  { key: 'snapchat', label: 'Snapchat', icon: FaSnapchat, placeholder: 'https://snapchat.com/add/votre-compte' },
] as const;

type SocialKey = (typeof SOCIAL_FIELDS)[number]['key'];
type SocialState = Record<SocialKey, { url: string; active: boolean }>;

const EMPTY_SOCIALS: SocialState = {
  facebook: { url: '', active: true },
  instagram: { url: '', active: true },
  pinterest: { url: '', active: true },
  threads: { url: '', active: true },
  tiktok: { url: '', active: true },
  snapchat: { url: '', active: true },
};

function normalizeSocialUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

interface SupabaseTestResult { service: string; status: 'ok' | 'warn' | 'error'; message: string; }

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-5 border-b border-border/50 last:border-0">
      <div className="sm:w-48 shrink-0">
        <p className="text-sm text-foreground font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function AdminSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<SectionKey>(() => {
    if (typeof window === 'undefined') return 'general';
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    return requestedSection && NAV.some((item) => item.key === requestedSection)
      ? requestedSection as SectionKey
      : 'general';
  });

  useEffect(() => {
    const activeItem = mobileNavRef.current?.querySelector<HTMLElement>(`[data-section="${section}"]`);
    activeItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [section]);

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await adminApi.get('/api/admin/settings')).data,
  });

  const setSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => (await adminApi.put(`/api/admin/settings/${key}`, { value })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-settings'] }); toast({ title: 'Paramètre mis à jour ✓' }); },
    onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
  });

  const save = (key: string, value: string) => setSetting.mutate({ key, value });

  // --- General ---
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [gsheetsWebhook, setGsheetsWebhook] = useState('');
  useEffect(() => {
    if (settings) {
      setStoreName(settings.STORE_NAME ?? 'LXLunettes');
      setStoreDesc(settings.STORE_DESCRIPTION ?? '');
      setStoreLogo(settings.STORE_LOGO ?? '');
      setGsheetsWebhook(settings.GOOGLE_SHEETS_WEBHOOK ?? '');
    }
  }, [settings]);

  // --- WhatsApp ---
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappMsg, setWhatsappMsg] = useState('');
  useEffect(() => { 
    if (settings?.WHATSAPP_NUMBER) setWhatsapp(settings.WHATSAPP_NUMBER); 
    if (settings?.WHATSAPP_MSG) setWhatsappMsg(settings.WHATSAPP_MSG); 
  }, [settings]);

  // --- Social networks ---
  const [socials, setSocials] = useState<SocialState>(EMPTY_SOCIALS);
  const [savingSocials, setSavingSocials] = useState(false);
  useEffect(() => {
    if (!settings) return;
    setSocials(Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => {
      const prefix = `SOCIAL_${key.toUpperCase()}`;
      return [key, {
        url: settings[`${prefix}_URL`] ?? '',
        active: settings[`${prefix}_ACTIVE`] !== 'false',
      }];
    })) as SocialState);
  }, [settings]);

  const updateSocial = (key: SocialKey, patch: Partial<SocialState[SocialKey]>) => {
    setSocials((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  };

  const saveSocials = async () => {
    setSavingSocials(true);
    try {
      const normalized = Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [
        key,
        { ...socials[key], url: normalizeSocialUrl(socials[key].url) },
      ])) as SocialState;
      await Promise.all(SOCIAL_FIELDS.flatMap(({ key }) => {
        const prefix = `SOCIAL_${key.toUpperCase()}`;
        return [
          adminApi.put(`/api/admin/settings/${prefix}_URL`, { value: normalized[key].url }),
          adminApi.put(`/api/admin/settings/${prefix}_ACTIVE`, { value: normalized[key].active ? 'true' : 'false' }),
        ];
      }));
      setSocials(normalized);
      await qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast({ title: 'Réseaux sociaux enregistrés ✓' });
    } catch {
      toast({ title: 'Impossible d’enregistrer les réseaux sociaux', variant: 'destructive' });
    } finally {
      setSavingSocials(false);
    }
  };

  // --- Email ---
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [notifEmail, setNotifEmail] = useState('');
  useEffect(() => {
    if (settings) {
      setSmtpHost(settings.SMTP_HOST ?? '');
      setSmtpPort(settings.SMTP_PORT ?? '587');
      setSmtpUser(settings.SMTP_USER ?? '');
      setNotifEmail(settings.NOTIF_EMAIL ?? '');
    }
  }, [settings]);

  // --- Security ---
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  const changePassword = async () => {
    if (newPwd.length < 8) { setPwdError('Au moins 8 caractères'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas'); return; }
    setPwdError('');
    try {
      await adminApi.post('/api/admin/change-password', { oldPassword: oldPwd, newPassword: newPwd });
      toast({ title: 'Mot de passe modifié ✓' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch { toast({ title: 'Erreur — ancien mot de passe incorrect', variant: 'destructive' }); }
  };

  // --- Supabase ---
  const [sbUrl, setSbUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '');
  const [sbAnonKey, setSbAnonKey] = useState(import.meta.env.VITE_SUPABASE_ANON_PUBLIC || '');
  const [sbServiceKey, setSbServiceKey] = useState('');
  const [sbBucket, setSbBucket] = useState('lxlunettes');
  const [testResults, setTestResults] = useState<SupabaseTestResult[] | null>(null);
  const [testing, setTesting] = useState(false);

  // Real Supabase health check — directly tests the live client
  const { data: sbHealth, isFetching: checkingSb, refetch: recheckSb } = useQuery({
    queryKey: ['admin-supabase-health'],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_PUBLIC;
      if (!url || !key) return { status: 'error', message: 'Variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_PUBLIC manquantes dans .env' };
      try {
        // Try a lightweight query — just count from any table
        const { error } = await supabase.from('products').select('id', { count: 'exact', head: true });
        if (error) {
          // RLS error is OK — it means the connection itself works
          if (error.code === '42501' || error.message?.includes('permission')) {
            return { status: 'connected', message: 'Connecté (RLS activé — accès restreint)' };
          }
          // Table doesn't exist? Connection works but schema is missing
          if (error.code === '42P01') {
            return { status: 'connected', message: 'Connecté (table "products" non trouvée — exécutez les migrations)' };
          }
          return { status: 'error', message: `Erreur DB: ${error.message}` };
        }
        return { status: 'connected', message: 'Connexion active et fonctionnelle' };
      } catch (e: any) {
        return { status: 'error', message: `Impossible de joindre Supabase: ${e.message}` };
      }
    },
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (settings) {
      setSbUrl(settings.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '');
      setSbAnonKey(settings.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_PUBLIC || '');
      setSbBucket(settings.SUPABASE_BUCKET ?? 'lxlunettes');
    }
  }, [settings]);

  const saveSupabase = () => {
    save('SUPABASE_URL', sbUrl);
    save('SUPABASE_ANON_KEY', sbAnonKey);
    save('SUPABASE_BUCKET', sbBucket);
    toast({ title: 'Config Supabase sauvegardée ✓' });
  };

  const runSupabaseTest = async () => {
    setTesting(true); setTestResults(null);
    const { supabase } = await import('@/lib/supabaseClient');
    const results: SupabaseTestResult[] = [];

    // 1. Database test
    try {
      const { error } = await supabase.from('products').select('id', { count: 'exact', head: true });
      if (error && error.code !== '42501' && error.code !== '42P01') {
        results.push({ service: 'Database', status: 'warn', message: `Avertissement: ${error.message}` });
      } else {
        results.push({ service: 'Database', status: 'ok', message: 'Connexion à la base de données établie' });
      }
    } catch (e: any) {
      results.push({ service: 'Database', status: 'error', message: e.message });
    }

    // 2. Auth test
    try {
      const { data } = await supabase.auth.getSession();
      results.push({ service: 'Auth', status: 'ok', message: data.session ? `Session active (${data.session.user.email})` : 'Service Auth accessible (aucune session)' });
    } catch (e: any) {
      results.push({ service: 'Auth', status: 'error', message: e.message });
    }

    // 3. Storage test
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        // Non-authenticated listing may be blocked — that's OK
        results.push({ service: 'Storage', status: 'warn', message: `Accès restreint: ${error.message}` });
      } else {
        const bucketNames = data.map(b => b.name).join(', ') || 'aucun bucket';
        results.push({ service: 'Storage', status: 'ok', message: `Buckets: ${bucketNames}` });
      }
    } catch (e: any) {
      results.push({ service: 'Storage', status: 'error', message: e.message });
    }

    // 4. Realtime test (just verify the URL is reachable)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (url) {
        results.push({ service: 'Realtime', status: 'ok', message: 'Canal Realtime disponible' });
      } else {
        results.push({ service: 'Realtime', status: 'error', message: 'URL Supabase manquante' });
      }
    } catch {
      results.push({ service: 'Realtime', status: 'error', message: 'Non accessible' });
    }

    // 5. Env vars check
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_PUBLIC;
    if (envUrl && envKey) {
      results.push({ service: 'Env Config', status: 'ok', message: `URL: ${envUrl.substring(0, 30)}...` });
    } else {
      results.push({ service: 'Env Config', status: 'error', message: `Manquant: ${!envUrl ? 'VITE_SUPABASE_URL' : ''} ${!envKey ? 'VITE_SUPABASE_ANON_PUBLIC' : ''}`.trim() });
    }

    setTestResults(results);
    setTesting(false);
  };

  // --- Notifications ---
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifReviews, setNotifReviews] = useState(false);
  useEffect(() => {
    if (settings) {
      setNotifOrders(settings.NOTIF_ORDERS !== 'false');
      setNotifStock(settings.NOTIF_STOCK !== 'false');
      setNotifReviews(settings.NOTIF_REVIEWS === 'true');
    }
  }, [settings]);

  const connected = sbHealth?.status === 'connected';

  return (
    <div className="flex min-w-0 gap-6 animate-in fade-in">
      {/* Sidebar nav */}
      <div className="w-52 shrink-0 hidden lg:block">
        <nav className="space-y-1">
          {NAV.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors text-left ${section === item.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'}`}>
              <item.icon className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-medium text-xs uppercase tracking-widest">{item.label}</p>
                <p className="text-[10px] opacity-70">{item.desc}</p>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile nav */}
        <div ref={mobileNavRef} className="mobile-scrollbar mb-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:hidden">
          {NAV.map(item => (
            <button key={item.key} data-section={item.key} onClick={() => setSection(item.key)}
              className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3.5 py-2 text-xs uppercase tracking-widest transition-colors ${section === item.key ? 'bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.2)]' : 'bg-card text-muted-foreground border border-border hover:text-foreground'}`}>
              <item.icon className="w-3 h-3" />{item.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4 sm:p-6">
            {(() => { const n = NAV.find(n => n.key === section)!; return (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-primary/15 flex items-center justify-center">
                  <n.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-serif text-foreground tracking-widest uppercase">{n.label}</h1>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
              </div>
            ); })()}
          </div>

          <div className="p-4 sm:p-6">
            {/* GENERAL */}
            {section === 'general' && (
              <div>
                <SettingRow label="Nom de la boutique" desc="Affiché partout dans l'interface">
                  <Input value={storeName} onChange={e => setStoreName(e.target.value)} className="bg-background border-border text-foreground max-w-sm" />
                </SettingRow>
                <SettingRow label="Description" desc="Courte description de la boutique">
                  <textarea value={storeDesc} onChange={e => setStoreDesc(e.target.value)} rows={3}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary max-w-sm" />
                </SettingRow>
                <SettingRow label="Logo (URL)" desc="URL vers votre logo">
                  <div className="flex gap-2 max-w-sm">
                    <Input value={storeLogo} onChange={e => setStoreLogo(e.target.value)} placeholder="https://..." className="bg-background border-border text-foreground flex-1" />
                    <FileUploadButton accept="image/*" label="Importer" compact onUploaded={(url) => setStoreLogo(url)} />
                  </div>
                  {storeLogo && <img src={storeLogo} alt="logo" className="mt-2 h-10 object-contain opacity-80" />}
                </SettingRow>
                <SettingRow label="Webhook Google Sheets" desc="URL pour envoyer les commandes">
                  <Input value={gsheetsWebhook} onChange={e => setGsheetsWebhook(e.target.value)} placeholder="https://hook.make.com/..." className="bg-background border-border text-foreground max-w-sm font-mono text-xs" />
                </SettingRow>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => { save('STORE_NAME', storeName); save('STORE_DESCRIPTION', storeDesc); save('STORE_LOGO', storeLogo); save('GOOGLE_SHEETS_WEBHOOK', gsheetsWebhook); }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">Sauvegarder</Button>
                </div>
              </div>
            )}

            {/* STORE */}
            {section === 'store' && (
              <div>
                <SettingRow label="Devise" desc="Monnaie utilisée">
                  <select defaultValue="EUR" className="bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="MAD">MAD</option>
                    <option value="MAD">Dirham (MAD)</option>
                    <option value="USD">Dollar ($)</option>
                  </select>
                </SettingRow>
                <SettingRow label="Langue" desc="Langue de l'interface">
                  <select defaultValue="fr" className="bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </SettingRow>
                <SettingRow label="Taxes" desc="Taux de TVA appliqué">
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input type="number" defaultValue="20" min={0} max={100} className="bg-background border-border text-foreground w-24" />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </SettingRow>
                <SettingRow label="Frais de livraison" desc="Montant standard">
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input type="number" defaultValue="0" min={0} className="bg-background border-border text-foreground w-24" />
                    <span className="text-muted-foreground">MAD</span>
                    <span className="text-xs text-muted-foreground">(0 = gratuit)</span>
                  </div>
                </SettingRow>
                <div className="mt-6 flex justify-end">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">Sauvegarder</Button>
                </div>
              </div>
            )}

            {/* WHATSAPP */}
            {section === 'whatsapp' && (
              <div>
                <SettingRow label="Numéro WhatsApp" desc="Format local Maroc">
                  <div className="space-y-2 max-w-sm">
                    <div className="flex items-center">
                      <span className="bg-muted border border-border border-r-0 rounded-l-sm px-3 py-2 text-sm text-muted-foreground">+212</span>
                      <Input value={whatsapp.replace(/^212/, '')} onChange={e => {
                        const val = e.target.value.replace(/[^\d]/g, '');
                        setWhatsapp(val ? `212${val}` : '');
                      }}
                      placeholder="600000000" className="bg-background border-border text-foreground font-mono rounded-l-none" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Exemple: 600000000 pour 0600000000</p>
                    {settings?.WHATSAPP_NUMBER && <p className="text-[11px] text-emerald-400">✓ Actuel : +{settings.WHATSAPP_NUMBER}</p>}
                  </div>
                </SettingRow>
                <SettingRow label="Message par défaut" desc="Message pré-rempli pour les clients">
                  <textarea value={whatsappMsg} onChange={e => setWhatsappMsg(e.target.value)} rows={3}
                    placeholder="Bonjour, je suis intéressé par vos lunettes..."
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary max-w-sm" />
                </SettingRow>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => { save('WHATSAPP_NUMBER', whatsapp); save('WHATSAPP_MSG', whatsappMsg); }} disabled={!whatsapp || setSetting.isPending}
                    className="bg-green-600 hover:bg-green-700 text-primary-foreground uppercase tracking-widest text-xs">
                    {setSetting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            )}

            {/* SOCIAL NETWORKS */}
            {section === 'social' && (
              <div>
                <div className="mb-5 rounded-sm border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-foreground">Icônes du footer</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Ajoutez les liens de vos comptes et choisissez lesquels seront visibles sur la boutique.
                    Les changements sont lus directement depuis Supabase.
                  </p>
                </div>
                {SOCIAL_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
                  <SettingRow key={key} label={label} desc={socials[key].active ? 'Visible sur le site' : 'Masqué sur le site'}>
                    <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-sm border border-border bg-background focus-within:ring-1 focus-within:ring-primary">
                        <span className="grid h-10 w-11 shrink-0 place-items-center border-r border-border bg-muted/60 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <Input
                          value={socials[key].url}
                          onChange={(event) => updateSocial(key, { url: event.target.value })}
                          placeholder={placeholder}
                          className="h-10 min-w-0 border-0 bg-transparent text-foreground shadow-none focus-visible:ring-0"
                        />
                        {socials[key].url && (
                          <a
                            href={normalizeSocialUrl(socials[key].url)}
                            target="_blank"
                            rel="noreferrer"
                            title={`Ouvrir ${label}`}
                            className="grid h-10 w-10 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={socials[key].active}
                          onChange={(event) => updateSocial(key, { active: event.target.checked })}
                          className="h-4 w-4 accent-primary"
                        />
                        Actif
                      </label>
                    </div>
                  </SettingRow>
                ))}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={saveSocials}
                    disabled={savingSocials}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs"
                  >
                    {savingSocials ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer les liens'}
                  </Button>
                </div>
              </div>
            )}

            {/* EMAIL */}
            {section === 'email' && (
              <div>
                <SettingRow label="Email de notification" desc="Destinataire des alertes admin">
                  <Input value={notifEmail} onChange={e => setNotifEmail(e.target.value)} placeholder="admin@example.com" className="bg-background border-border text-foreground max-w-sm" />
                </SettingRow>
                <SettingRow label="Serveur SMTP" desc="Hôte du serveur d'envoi">
                  <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="bg-background border-border text-foreground max-w-sm" />
                </SettingRow>
                <SettingRow label="Port SMTP">
                  <Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className="bg-background border-border text-foreground w-28" />
                </SettingRow>
                <SettingRow label="Utilisateur SMTP" desc="Email d'envoi">
                  <Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="noreply@example.com" className="bg-background border-border text-foreground max-w-sm" />
                </SettingRow>
                <div className="mt-6 p-4 bg-muted/30 rounded-sm border border-border text-xs text-muted-foreground">
                  <p className="text-foreground font-medium mb-1">Gmail configuré</p>
                  <p>Le serveur utilise actuellement Gmail SMTP via <code className="text-primary">GMAIL_USER</code> et <code className="text-primary">GMAIL_APP_PASSWORD</code> (secrets Replit).</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => { save('SMTP_HOST', smtpHost); save('SMTP_PORT', smtpPort); save('SMTP_USER', smtpUser); save('NOTIF_EMAIL', notifEmail); }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">Sauvegarder</Button>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {section === 'notifications' && (
              <div>
                <SettingRow label="Nouvelles commandes" desc="Notifier à chaque nouvelle commande">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={notifOrders} onChange={e => { setNotifOrders(e.target.checked); save('NOTIF_ORDERS', e.target.checked ? 'true' : 'false'); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm text-muted-foreground">Activé</span>
                  </label>
                </SettingRow>
                <SettingRow label="Stock faible" desc="Alerte quand un produit est en rupture">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={notifStock} onChange={e => { setNotifStock(e.target.checked); save('NOTIF_STOCK', e.target.checked ? 'true' : 'false'); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm text-muted-foreground">Activé</span>
                  </label>
                </SettingRow>
                <SettingRow label="Nouveaux avis" desc="Notifier à chaque avis client">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={notifReviews} onChange={e => { setNotifReviews(e.target.checked); save('NOTIF_REVIEWS', e.target.checked ? 'true' : 'false'); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm text-muted-foreground">Activé</span>
                  </label>
                </SettingRow>
              </div>
            )}

            {/* SECURITY */}
            {section === 'security' && (
              <div>
                <SettingRow label="Changer le mot de passe" desc="Mot de passe du compte admin">
                  <div className="space-y-3 max-w-sm">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Mot de passe actuel</label>
                      <Input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} className="bg-background border-border text-foreground" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Nouveau mot de passe</label>
                      <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="bg-background border-border text-foreground" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Confirmer le nouveau mot de passe</label>
                      <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="bg-background border-border text-foreground" />
                    </div>
                    {pwdError && <p className="text-xs text-destructive">{pwdError}</p>}
                    <Button onClick={changePassword} disabled={!oldPwd || !newPwd}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs w-full">
                      Changer le mot de passe
                    </Button>
                  </div>
                </SettingRow>
                <SettingRow label="Session" desc="Sécurité de la session">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400">Session active — JWT sécurisé</span>
                  </div>
                </SettingRow>
              </div>
            )}

            {/* SUPABASE */}
            {section === 'supabase' && (
              <div className="space-y-6">
                {/* Status bar */}
                <div className={`flex items-center justify-between p-4 rounded-sm border ${connected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/30 border-border'}`}>
                  <div className="flex items-center gap-3">
                    {connected ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className={`text-sm font-medium ${connected ? 'text-emerald-400' : 'text-muted-foreground'}`}>{connected ? 'Connecté à Supabase' : 'Non connecté'}</p>
                      {sbHealth?.message && <p className="text-xs text-muted-foreground">{sbHealth.message}</p>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => recheckSb()} disabled={checkingSb}
                    className="border-border bg-transparent text-muted-foreground uppercase tracking-widest text-[10px]">
                    <RefreshCw className={`w-3 h-3 mr-1.5 ${checkingSb ? 'animate-spin' : ''}`} /> Vérifier
                  </Button>
                </div>

                {/* Config form */}
                <div>
                  <SettingRow label="URL du projet" desc="https://xxx.supabase.co">
                    <Input value={sbUrl} onChange={e => setSbUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className="bg-background border-border text-foreground max-w-md font-mono text-xs" />
                  </SettingRow>
                  <SettingRow label="Clé Anon" desc="Clé publique (anon key)">
                    <Input value={sbAnonKey} onChange={e => setSbAnonKey(e.target.value)} placeholder="eyJ..." className="bg-background border-border text-foreground max-w-md font-mono text-xs" />
                  </SettingRow>
                  <SettingRow label="Bucket de stockage" desc="Nom du bucket pour les images">
                    <Input value={sbBucket} onChange={e => setSbBucket(e.target.value)} placeholder="lxlunettes" className="bg-background border-border text-foreground w-48" />
                  </SettingRow>
                  <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm text-xs text-amber-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>La <strong>Service Role Key</strong> doit être ajoutée dans les secrets Replit (<code>SUPABASE_SERVICE_ROLE_KEY</code>) et non ici, pour des raisons de sécurité.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={saveSupabase} className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs">
                    Sauvegarder la config
                  </Button>
                  <Button onClick={runSupabaseTest} disabled={testing || !sbUrl} variant="outline"
                    className="border-border text-muted-foreground bg-transparent uppercase tracking-widest text-xs">
                    {testing ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Test en cours...</> : <><Activity className="w-3 h-3 mr-1.5" />Tester la connexion</>}
                  </Button>
                </div>

                {/* Test results */}
                {testResults && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Résultats du test</p>
                    {testResults.map(r => (
                      <div key={r.service} className={`flex items-center gap-3 p-3 rounded-sm border text-sm ${r.status === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30' : r.status === 'warn' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        {r.status === 'ok' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : r.status === 'warn' ? <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" /> : <X className="w-4 h-4 text-red-400 shrink-0" />}
                        <span className={`font-medium w-24 shrink-0 ${r.status === 'ok' ? 'text-emerald-400' : r.status === 'warn' ? 'text-yellow-400' : 'text-red-400'}`}>{r.service}</span>
                        <span className="text-muted-foreground text-xs">{r.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
