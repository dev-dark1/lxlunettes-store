import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';

import { useCart, type CartItem } from '@/hooks/useCart';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Le nom complet est requis.'),
  customerPhone: z.string().trim().min(8, 'Un numéro de téléphone valide est requis.'),
  customerEmail: z.union([z.string().trim().email('Email invalide.'), z.literal('')]),
  city: z.string().trim().min(2, 'La ville est requise.'),
  country: z.string().trim().min(2, 'Le pays est requis.'),
  address: z.string().trim().min(5, "L'adresse de livraison est requise."),
  customerNote: z.string().trim().max(500, 'La note est trop longue.').optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

type Confirmation = {
  orderNumber: string;
  whatsappUrl: string;
  items: CartItem[];
  total: number;
};

const emptyValues: CheckoutFormValues = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  city: '',
  country: 'Maroc',
  address: '',
  customerNote: '',
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error || body?.message || 'Impossible de créer la commande.';
  } catch {
    return 'Le service de commande est momentanément indisponible.';
  }
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, isHydrated } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    let active = true;

    const loadAccountProfile = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      if (error || !data.user) {
        setIsProfileLoading(false);
        return;
      }

      const user = data.user;
      const metadata = user.user_metadata ?? {};
      const saved = metadata.checkout_profile ?? metadata;
      const firstName = saved.first_name ?? saved.firstName ?? '';
      const lastName = saved.last_name ?? saved.lastName ?? '';
      const savedName = saved.name ?? saved.full_name ?? `${firstName} ${lastName}`.trim();

      setAccountUserId(user.id);
      form.reset({
        customerName: savedName ?? '',
        customerPhone: saved.phone ?? '',
        customerEmail: user.email ?? '',
        city: saved.city ?? '',
        country: saved.country ?? 'Maroc',
        address: saved.address ?? '',
        customerNote: '',
      });
      setIsProfileLoading(false);
    };

    void loadAccountProfile();
    return () => {
      active = false;
    };
  }, [form]);

  useEffect(() => {
    if (isHydrated && items.length === 0 && !confirmation) {
      setLocation('/panier');
    }
  }, [confirmation, isHydrated, items.length, setLocation]);

  const copyOrderNumber = async () => {
    if (!confirmation) return;
    try {
      await navigator.clipboard.writeText(confirmation.orderNumber);
      setCopied(true);
      toast({ title: 'Numéro copié', description: confirmation.orderNumber });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: 'Copie impossible',
        description: `Numéro de commande : ${confirmation.orderNumber}`,
        variant: 'destructive',
      });
    }
  };

  const saveRegisteredProfile = async (values: CheckoutFormValues) => {
    if (!accountUserId) return;
    const { data } = await supabase.auth.getUser();
    const existingMetadata = data.user?.user_metadata ?? {};
    const { error } = await supabase.auth.updateUser({
      data: {
        ...existingMetadata,
        checkout_profile: {
          name: values.customerName,
          phone: values.customerPhone,
          city: values.city,
          country: values.country,
          address: values.address,
        },
      },
    });
    if (error) console.warn('Unable to save checkout profile:', error.message);
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    if (submittingRef.current || items.length === 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    const orderedItems = items.map((item) => ({ ...item }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...values,
          customerEmail: values.customerEmail || null,
          customerNote: values.customerNote || null,
          items: orderedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) throw new Error(await readApiError(response));

      const result = await response.json();
      const orderNumber = result?.order?.orderNumber;
      const whatsappUrl = result?.whatsappUrl;
      if (!orderNumber || !whatsappUrl) {
        throw new Error('La confirmation reçue est incomplète. Le panier a été conservé.');
      }

      setConfirmation({
        orderNumber,
        whatsappUrl,
        items: orderedItems,
        total: Number(result.order.total ?? totalPrice),
      });
      clearCart();
      void saveRegisteredProfile(values);
      toast({
        title: 'Commande enregistrée',
        description: `Votre numéro est ${orderNumber}.`,
      });
    } catch (error) {
      toast({
        title: 'Commande non envoyée',
        description: error instanceof Error ? error.message : 'Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isHydrated || isProfileLoading) {
    return (
      <div className="container mx-auto flex min-h-[65vh] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6 text-center shadow-[0_0_60px_rgba(201,168,76,0.12)] md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.14),transparent_45%)]" />
          <div className="relative">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-primary">Commande confirmée</p>
            <h1 className="mb-3 font-serif text-3xl tracking-wider text-foreground md:text-5xl">Merci pour votre confiance</h1>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Copiez votre numéro, puis ouvrez WhatsApp pour valider le paiement. Le message contient déjà le numéro de commande, le nom et le code de chaque produit.
            </p>

            <div className="mx-auto mb-8 flex max-w-md items-center justify-between gap-4 rounded-xl border border-border bg-background/70 px-5 py-4 text-left">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Numéro de commande</p>
                <p className="mt-1 font-mono text-xl font-bold tracking-wider text-primary md:text-2xl">{confirmation.orderNumber}</p>
              </div>
              <Button type="button" size="icon" variant="outline" onClick={copyOrderNumber} aria-label="Copier le numéro de commande">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mx-auto mb-8 max-w-xl rounded-xl border border-border bg-background/50 p-5 text-left">
              <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Résumé</p>
              <div className="space-y-3">
                {confirmation.items.map((item) => (
                  <div key={item.productId} className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Code : {item.sku || 'N/A'} · Quantité : {item.quantity}</p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium text-primary">
                      {((item.salePrice ?? item.price) * item.quantity).toFixed(2)} MAD
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t border-border pt-4 font-medium">
                <span>Total</span>
                <span className="text-primary">{confirmation.total.toFixed(2)} MAD</span>
              </div>
            </div>

            <Button asChild className="h-14 w-full max-w-xl bg-[#25D366] text-sm font-bold uppercase tracking-[0.18em] text-white hover:bg-[#20bd5a]">
              <a href={confirmation.whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" /> Payer · Validation WhatsApp
              </a>
            </Button>
            <Button type="button" variant="ghost" className="mt-4 text-muted-foreground" onClick={() => setLocation('/boutique')}>
              Continuer mes achats
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <button type="button" onClick={() => setLocation('/panier')} className="mb-8 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Retour au panier
      </button>

      <div className="mb-10">
        <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-primary">Dernière étape</p>
        <h1 className="font-serif text-4xl tracking-wider text-foreground md:text-6xl">Finaliser la commande</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="mb-7 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            {accountUserId ? <UserCheck className="mt-0.5 h-5 w-5 text-primary" /> : <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />}
            <div>
              <p className="text-sm font-medium text-foreground">{accountUserId ? 'Informations du compte chargées' : 'Commande sans compte'}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {accountUserId
                  ? 'Vos informations sont préremplies et seront mises à jour pour votre prochaine commande.'
                  : 'Ces informations servent uniquement à cette commande. Elles devront être remplies à nouveau lors d’une prochaine commande.'}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="customerName" render={({ field }) => (
                <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid gap-5 md:grid-cols-2">
                <FormField control={form.control} name="customerPhone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone / WhatsApp</FormLabel><FormControl><Input type="tel" autoComplete="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="customerEmail" render={({ field }) => (
                  <FormItem><FormLabel>Email (optionnel)</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Ville</FormLabel><FormControl><Input autoComplete="address-level2" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Pays</FormLabel><FormControl><Input autoComplete="country-name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Adresse de livraison</FormLabel><FormControl><Textarea autoComplete="street-address" rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="customerNote" render={({ field }) => (
                <FormItem><FormLabel>Note (optionnel)</FormLabel><FormControl><Textarea rows={3} placeholder="Précisions de livraison, disponibilité…" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" disabled={isSubmitting} className="h-14 w-full bg-primary text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…</> : <><ShoppingBag className="mr-2 h-4 w-4" /> Confirmer la commande</>}
              </Button>
            </form>
          </Form>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <p className="mb-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Votre commande</p>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-3 border-b border-border/60 pb-4 last:border-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background">
                  {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-contain" /> : <ShoppingBag className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.sku || 'N/A'} · × {item.quantity}</p>
                  <p className="mt-1 text-sm font-medium text-primary">{((item.salePrice ?? item.price) * item.quantity).toFixed(2)} MAD</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-5 text-lg font-medium">
            <span>Total</span><span className="text-primary">{totalPrice.toFixed(2)} MAD</span>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Validation finale sécurisée via WhatsApp</p>
        </aside>
      </div>
    </div>
  );
}
