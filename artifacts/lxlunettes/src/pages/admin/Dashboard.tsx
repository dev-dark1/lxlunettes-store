import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown, Minus, BarChart2, Activity, ExternalLink, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { adminApi } from '@/lib/adminApi';
import { FaFacebookF, FaInstagram, FaPinterestP, FaSnapchat, FaThreads, FaTiktok } from 'react-icons/fa6';

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const from = display;
    const to = value;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  const fmt = display.toFixed(decimals);
  return <span>{prefix}{Number(fmt).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

// ─── Shimmer card ─────────────────────────────────────────────────────────────
function GlowCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.21, 1.02, 0.73, 1] }}
      className={`relative rounded-xl overflow-hidden group ${className}`}
    >
      {/* gradient border */}
      <div className="absolute inset-0 rounded-xl p-px bg-gradient-to-br from-primary/30 via-transparent to-primary/10 pointer-events-none z-10" />
      {/* shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent z-20 pointer-events-none" />
      <div className="relative bg-card rounded-xl h-full z-0">{children}</div>
    </motion.div>
  );
}

// ─── Stat metric card ─────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, trend, color, delay = 0,
}: {
  icon: any; label: string; value: number; sub?: string;
  trend?: 'up' | 'down' | 'neutral'; color: string; delay?: number;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground';

  return (
    <GlowCard delay={delay}>
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <span className={`flex items-center gap-1 text-[10px] uppercase tracking-widest font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{label}</p>
          <div className="break-words text-2xl font-bold text-foreground tabular-nums sm:text-3xl">
            <AnimatedNumber value={value} decimals={label.includes('Affaires') ? 2 : 0} suffix={label.includes('Affaires') ? ' MAD' : ''} />
          </div>
          {sub && <p className={`text-xs mt-1 ${trendColor}`}>{sub}</p>}
        </div>
      </div>
      {/* bottom accent bar */}
      <div className={`h-0.5 w-full ${color.replace('/10', '/60').replace('bg-', 'bg-')}`} />
    </GlowCard>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-primary font-bold">{payload[0].value?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD</p>
    </div>
  );
};

const PIE_COLORS = ['#C9A84C', '#8B8B96', '#3B82F6', '#8B1A1A', '#16A34A'];

const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', icon: FaFacebookF },
  { key: 'instagram', label: 'Instagram', icon: FaInstagram },
  { key: 'tiktok', label: 'TikTok', icon: FaTiktok },
  { key: 'snapchat', label: 'Snapchat', icon: FaSnapchat },
  { key: 'pinterest', label: 'Pinterest', icon: FaPinterestP },
  { key: 'threads', label: 'Threads', icon: FaThreads },
] as const;

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!localStorage.getItem('lxlunettes_admin_token')) setLocation('/admin/login');
  }, [setLocation]);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const serverStats = (await adminApi.get('/api/admin/dashboard/stats')).data;
      return {
        totalRevenue: Number(serverStats.revenue?.estimated ?? 0),
        activeOrders: Math.max(0, Number(serverStats.orders?.total ?? 0) - Number(serverStats.orders?.delivered ?? 0) - Number(serverStats.orders?.cancelled ?? 0)),
        totalCustomers: Number(serverStats.customers ?? 0),
        totalProducts: Number(serverStats.products?.total ?? 0),
        categoryBreakdown: serverStats.categoryBreakdown ?? [],
      };
    }
  });

  const { data: recentOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
      if (error) return [];
      return (data || []).map((order: any) => ({
        ...order,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        total: Number(order.total ?? 0),
      }));
    }
  });

  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-top-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('order_items').select('product_id, product_name, quantity, total_price');
      if (error) return [];
      const grouped = (data || []).reduce<Record<string, any>>((acc, item: any) => {
        const current = acc[item.product_id] ?? {
          productId: item.product_id,
          productName: item.product_name,
          totalOrdered: 0,
          revenue: 0,
        };
        current.totalOrdered += Number(item.quantity ?? 0);
        current.revenue += Number(item.total_price ?? 0);
        acc[item.product_id] = current;
        return acc;
      }, {});
      return Object.values(grouped).sort((a: any, b: any) => b.totalOrdered - a.totalOrdered).slice(0, 5);
    }
  });

  const { data: chartData } = useQuery({
    queryKey: ['admin-chart'],
    queryFn: async () => {
      const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from('orders').select('total, status, created_at').gte('created_at', since).order('created_at');
      if (error) return [];
      const byDay = (data || [])
        .filter((order: any) => !['cancelled', 'refunded'].includes(order.status))
        .reduce<Record<string, number>>((acc, order: any) => {
          const key = String(order.created_at).slice(0, 10);
          acc[key] = (acc[key] ?? 0) + Number(order.total ?? 0);
          return acc;
        }, {});
      return Object.entries(byDay).map(([date, revenue]) => ({
        date: new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        revenue,
      }));
    }
  });

  const { data: socialSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ['admin-social-settings'],
    queryFn: async () => (await adminApi.get('/api/admin/settings')).data,
  });

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loadingStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl bg-card" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          <Skeleton className="h-64 rounded-xl bg-card lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  const chartRows = (chartData as any) ?? [];
  const pieData = (stats as any)?.categoryBreakdown ?? [];

  return (
    <div className="min-w-0 space-y-5 sm:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0">
          <h1 className="mb-1 text-2xl font-serif uppercase tracking-[0.14em] text-foreground sm:text-3xl sm:tracking-widest">Vue d'Ensemble</h1>
          <p className="text-muted-foreground text-sm capitalize">{today}</p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Données en temps réel
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <StatCard
          icon={DollarSign}
          label="Chiffre d'Affaires"
          value={stats?.totalRevenue ?? 0}
          sub="Estimation totale"
          trend="up"
          color="bg-primary/10 text-primary"
          delay={0}
        />
        <StatCard
          icon={ShoppingCart}
          label="Commandes"
          value={stats?.activeOrders ?? 0}
          sub={`nouvelles aujourd'hui`}
          trend="up"
          color="bg-blue-500/10 text-blue-400"
          delay={0.08}
        />
        <StatCard
          icon={Users}
          label="Clients"
          value={stats?.totalCustomers ?? 0}
          sub="Comptes enregistrés"
          trend="neutral"
          color="bg-violet-500/10 text-violet-400"
          delay={0.16}
        />
        <StatCard
          icon={Package}
          label="Produits"
          value={stats?.totalProducts ?? 0}
          sub={`en stock`}
          trend="up"
          color="bg-emerald-500/10 text-emerald-400"
          delay={0.24}
        />
      </div>

      {/* Charts row */}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Revenue area chart */}
        <GlowCard className="lg:col-span-2" delay={0.3}>
          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-6 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">Revenu 30 jours</p>
                <p className="break-words text-lg font-bold text-foreground sm:text-xl">
                  <AnimatedNumber value={stats?.totalRevenue ?? 0} decimals={2} suffix=" MAD" />
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            {chartRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartRows} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: '#C9A84C' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                Pas encore de données
              </div>
            )}
          </div>
        </GlowCard>

        {/* Category pie */}
        <GlowCard delay={0.35}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">Par Catégorie</p>
                <p className="text-xl font-bold text-foreground">{stats?.totalProducts ?? 0} produits</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="count">
                      {pieData.map((_: any, index: number) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} produits`]} contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.slice(0, 4).map((cat: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground truncate max-w-[100px]">{cat.category}</span>
                      </div>
                      <span className="text-foreground font-medium">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                Pas encore de données
              </div>
            )}
          </div>
        </GlowCard>
      </div>

      {/* Activity row */}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Recent orders */}
        <GlowCard delay={0.4}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Dernières commandes</p>
              <button type="button" className="shrink-0 text-[10px] uppercase tracking-widest text-primary hover:underline" onClick={() => location.href = '/admin/commandes'}>Voir tout</button>
            </div>
            {loadingOrders ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 bg-muted rounded-lg" />)}</div>
            ) : (
              <div className="space-y-2">
                {recentOrders?.map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                    className="flex flex-col items-start justify-between rounded-lg border border-border/50 bg-background/60 p-3 transition-colors hover:border-primary/30 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-foreground font-medium text-sm">{order.orderNumber}</span>
                      <span className="text-xs text-muted-foreground truncate">{order.customerName}</span>
                    </div>
                    <div className="mt-2 flex w-full flex-wrap items-center justify-between gap-2 sm:mt-0 sm:w-auto sm:flex-nowrap sm:justify-start sm:gap-3">
                      <span className="text-primary font-medium text-sm">{order.total.toFixed(2)} MAD</span>
                      <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-medium ${
                        order.status === 'new'       ? 'bg-primary/15 text-primary' :
                        order.status === 'confirmed' ? 'bg-blue-500/15 text-blue-400' :
                        order.status === 'shipped'   ? 'bg-violet-500/15 text-violet-400' :
                        order.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-400' :
                                                       'bg-muted text-muted-foreground'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">Aucune commande</div>
                )}
              </div>
            )}
          </div>
        </GlowCard>

        {/* Top products */}
        <GlowCard delay={0.45}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Produits phares</p>
              <button type="button" className="shrink-0 text-[10px] uppercase tracking-widest text-primary hover:underline" onClick={() => location.href = '/admin/produits'}>Voir tout</button>
            </div>
            {loadingProducts ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 bg-muted rounded-lg" />)}</div>
            ) : (
              <div className="space-y-2">
                {topProducts?.map((product, i) => (
                  <motion.div
                    key={product.productId}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-background/60 border border-border/50 rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <div className="w-8 h-8 bg-muted rounded-lg overflow-hidden flex items-center justify-center shrink-0 text-xs text-muted-foreground font-bold">
                      {i + 1}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-foreground font-medium text-sm truncate">{product.productName}</span>
                      <span className="text-xs text-muted-foreground">{product.totalOrdered} unités vendues</span>
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-primary sm:text-sm">{product.revenue.toFixed(2)} MAD</div>
                  </motion.div>
                ))}
                {(!topProducts || topProducts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">Aucune donnée</div>
                )}
              </div>
            )}
          </div>
        </GlowCard>
      </div>

      {/* Social media quick access */}
      <GlowCard delay={0.5}>
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Share2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Social Media</p>
                <p className="mt-1 text-sm text-foreground">Liens visibles dans le footer de la boutique</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocation('/admin/parametres?section=social')}
              className="shrink-0 rounded-full border border-primary/30 px-3 py-2 text-[10px] uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Modifier
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SOCIAL_NETWORKS.map(({ key, label, icon: Icon }) => {
              const prefix = `SOCIAL_${key.toUpperCase()}`;
              const href = socialSettings[`${prefix}_URL`]?.trim();
              const connected = Boolean(href) && socialSettings[`${prefix}_ACTIVE`] !== 'false';
              const content = (
                <>
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${connected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{label}</span>
                  {connected
                    ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                    : <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />}
                </>
              );

              return connected ? (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/20 bg-background/60 p-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/50"
                  aria-label={`Ouvrir ${label}`}
                >
                  {content}
                </a>
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLocation('/admin/parametres?section=social')}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5 text-left transition-colors hover:border-primary/30"
                  aria-label={`Configurer ${label}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
