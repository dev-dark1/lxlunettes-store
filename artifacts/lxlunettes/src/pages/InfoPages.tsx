import { type FormEvent, type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Clock3, Glasses, Headphones, Mail, MapPin, MessageCircle, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const FALLBACK_WHATSAPP_NUMBER = '212779524872';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || import.meta.env.VITE_ADMIN_EMAIL || 'contact@lxlunettes.com';

function useWhatsAppNumber() {
  const { data } = useQuery({
    queryKey: ['public-whatsapp-number'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('value').eq('key', 'WHATSAPP_NUMBER').maybeSingle();
      if (error) throw error;
      return String(data?.value || FALLBACK_WHATSAPP_NUMBER).replace(/\D/g, '');
    },
    staleTime: 60_000,
  });
  return data || FALLBACK_WHATSAPP_NUMBER;
}

function PageShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border bg-card py-16 md:py-24">
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="container relative mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.35em] text-primary">{eyebrow}</p>
          <h1 className="font-serif text-4xl tracking-wide md:text-6xl">{title}</h1>
          <div className="mx-auto my-7 h-px w-16 bg-primary" />
          <p className="mx-auto max-w-2xl text-sm font-light leading-7 text-muted-foreground md:text-base">{intro}</p>
        </div>
      </section>
      <div className="container mx-auto max-w-5xl px-4 py-14 md:py-20">{children}</div>
    </div>
  );
}

function ContentCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border border-border bg-card/60 p-6 md:p-8"><h2 className="mb-4 font-serif text-2xl text-primary">{title}</h2><div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div></section>;
}

export function AboutPage() {
  const values = [
    { icon: Glasses, title: 'Une sélection exigeante', text: 'Des montures choisies pour leur design, leur confort et leur capacité à accompagner votre style au quotidien.' },
    { icon: ShieldCheck, title: 'Authenticité', text: 'Nous privilégions des références clairement présentées et un accompagnement transparent avant comme après la commande.' },
    { icon: Sparkles, title: 'Service personnel', text: 'Notre équipe vous guide pour trouver la forme, la couleur et la collection qui vous ressemblent vraiment.' },
  ];

  return (
    <PageShell eyebrow="L’univers LXLunettes" title="À propos" intro="Une boutique marocaine dédiée aux lunettes de caractère, pensée pour rendre l’élégance plus simple, plus personnelle et plus proche.">
      <div className="grid gap-6 md:grid-cols-3">
        {values.map(({ icon: Icon, title, text }) => (
          <ContentCard key={title} title={title}>
            <Icon className="mb-4 h-7 w-7 text-primary" />
            <p>{text}</p>
          </ContentCard>
        ))}
      </div>
      <section className="mt-8 border border-primary/25 bg-primary/5 p-7 text-center md:p-10">
        <p className="mx-auto max-w-3xl font-serif text-2xl leading-relaxed md:text-3xl">LXLunettes, c’est le regard juste entre inspiration, qualité et conseil.</p>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">Depuis notre sélection jusqu’à la livraison, chaque étape est pensée pour que vous puissiez choisir votre prochaine monture en confiance.</p>
      </section>
    </PageShell>
  );
}

export function ContactPage() {
  const { toast } = useToast();
  const whatsappNumber = useWhatsAppNumber();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = [
      'Bonjour LXLunettes,',
      `Nom : ${form.name}`,
      `E-mail : ${form.email}`,
      form.phone ? `Téléphone : ${form.phone}` : '',
      `Sujet : ${form.subject}`,
      '',
      form.message,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    toast({ title: 'Message préparé', description: 'Confirmez son envoi dans WhatsApp.' });
  };

  return (
    <PageShell eyebrow="Service client" title="Contactez-nous" intro="Notre équipe vous accompagne avant, pendant et après votre commande.">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          {[
            [MessageCircle, 'WhatsApp', `+${whatsappNumber}`, `https://wa.me/${whatsappNumber}`],
            [Mail, 'E-mail', CONTACT_EMAIL, `mailto:${CONTACT_EMAIL}`],
            [Clock3, 'Horaires', 'Lun–Sam · 09:00–19:00', ''],
            [MapPin, 'Zone de service', 'Livraison partout au Maroc', ''],
          ].map(([Icon, title, value, href]: any) => (
            <div key={title} className="flex gap-4 border border-border bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
              <div><p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</p>{href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="mt-1 block text-sm hover:text-primary">{value}</a> : <p className="mt-1 text-sm">{value}</p>}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-5 border border-border bg-card p-6 md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom complet" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <Field label="E-mail" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <Field label="Téléphone (optionnel)" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required={false} />
            <Field label="Sujet" value={form.subject} onChange={(subject) => setForm({ ...form, subject })} />
          </div>
          <div className="space-y-2"><label className="text-[10px] uppercase tracking-widest text-muted-foreground">Votre message</label><Textarea required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={6} className="bg-background border-border" placeholder="Comment pouvons-nous vous aider ?" /></div>
          <Button type="submit" className="w-full py-6 uppercase tracking-[0.2em] font-bold"><MessageCircle className="mr-2 h-4 w-4" /> Envoyer via WhatsApp</Button>
          <p className="text-center text-[10px] leading-5 text-muted-foreground">Aucune information n’est envoyée avant votre confirmation dans WhatsApp.</p>
        </form>
      </div>
    </PageShell>
  );
}

function Field({ label, value, onChange, required = true, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <div className="space-y-2"><label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label><Input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="bg-background border-border" /></div>;
}

const faqs = [
  ['Les produits sont-ils authentiques ?', 'Oui. LXLunettes sélectionne ses modèles auprès de circuits professionnels et contrôle chaque article avant expédition.'],
  ['Comment passer une commande ?', 'Ajoutez vos lunettes au panier, ouvrez « Commander », complétez vos coordonnées puis confirmez. Un numéro de commande unique est généré et repris dans le message WhatsApp.'],
  ['Dois-je créer un compte ?', 'Non. Vous pouvez commander en invité. Avec un compte, vos coordonnées sont mémorisées pour vos prochaines commandes et vous accédez plus facilement à votre profil.'],
  ['Quels sont les délais de livraison ?', 'La préparation prend généralement 1 jour ouvré. La livraison prend ensuite environ 1 à 3 jours ouvrés selon la ville et l’accessibilité de l’adresse.'],
  ['Puis-je modifier ou annuler ma commande ?', 'Contactez-nous rapidement sur WhatsApp avec votre numéro de commande. Une modification reste possible tant que le colis n’a pas été remis au transporteur.'],
  ['Comment effectuer un retour ?', 'Signalez votre demande dans les 7 jours suivant la réception. L’article doit être non porté, complet et dans son emballage d’origine. Consultez la page Retours pour les détails.'],
  ['Comment entretenir mes lunettes ?', 'Rincez les verres à l’eau tiède, utilisez un chiffon microfibre propre et rangez toujours la monture dans son étui. Évitez les solvants et la chaleur élevée.'],
];

export function FaqPage() {
  return <PageShell eyebrow="Nous vous répondons" title="Questions fréquentes" intro="Les réponses essentielles pour commander en toute sérénité."><div className="mx-auto max-w-3xl divide-y divide-border border border-border bg-card">{faqs.map(([question, answer]) => <details key={question} className="group p-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg"><span>{question}</span><ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform group-open:rotate-180" /></summary><p className="pt-4 text-sm leading-7 text-muted-foreground">{answer}</p></details>)}</div><SupportCta /></PageShell>;
}

export function DeliveryPage() {
  return <PageShell eyebrow="Expédition" title="Livraison" intro="Une préparation soignée et un suivi clair jusqu’à la remise de votre commande."><div className="grid gap-6 md:grid-cols-3">{[
    [PackageCheck, 'Préparation', 'Chaque modèle est contrôlé, protégé dans son étui et emballé avant l’expédition. Préparation habituelle : 1 jour ouvré.'],
    [Truck, 'Délais', 'Livraison estimée sous 1 à 3 jours ouvrés au Maroc après préparation. Les zones éloignées peuvent demander un délai supplémentaire.'],
    [Headphones, 'Suivi', 'Conservez votre numéro de commande. Notre service client vous renseigne via WhatsApp sur l’avancement de la livraison.'],
  ].map(([Icon, title, text]: any) => <div key={title} className="border border-border bg-card p-7"><Icon className="mb-6 h-6 w-6 text-primary" /><h2 className="mb-3 font-serif text-xl">{title}</h2><p className="text-sm leading-7 text-muted-foreground">{text}</p></div>)}</div><div className="mt-8 grid gap-6 md:grid-cols-2"><ContentCard title="Réception du colis"><p>Vérifiez l’état extérieur du colis lors de sa réception. En cas de dommage visible, prenez des photos avant ouverture et contactez-nous le jour même avec votre numéro de commande.</p></ContentCard><ContentCard title="Adresse et disponibilité"><p>Indiquez une adresse complète, votre ville et un numéro joignable. Le transporteur peut vous appeler avant la remise. Une nouvelle présentation peut entraîner un délai supplémentaire.</p></ContentCard></div><SupportCta /></PageShell>;
}

export function ReturnsPage() {
  return <PageShell eyebrow="Après-vente" title="Retours & échanges" intro="Une procédure simple pour signaler rapidement un problème après réception."><div className="grid gap-6 md:grid-cols-3">{[
    ['01', 'Contactez-nous', 'Dans les 7 jours suivant la réception, envoyez votre numéro de commande et le motif du retour sur WhatsApp.'],
    ['02', 'Recevez l’accord', 'Notre équipe vérifie l’éligibilité et vous communique l’adresse et les instructions de retour.'],
    ['03', 'Renvoyez l’article', 'Replacez le produit non porté avec l’étui, les accessoires et l’emballage d’origine.'],
  ].map(([number, title, text]) => <div key={number} className="border border-border bg-card p-7"><span className="font-serif text-4xl text-primary/40">{number}</span><h2 className="mb-3 mt-5 font-serif text-xl">{title}</h2><p className="text-sm leading-7 text-muted-foreground">{text}</p></div>)}</div><div className="mt-8 grid gap-6 md:grid-cols-2"><ContentCard title="Conditions d’acceptation"><p>Le produit doit être non porté, non rayé, complet et dans son état d’origine. Les articles endommagés après livraison, personnalisés ou retournés incomplets ne peuvent pas être repris.</p><p>Tout défaut ou produit incorrect doit être signalé avec des photos dans les 48 heures suivant la réception.</p></ContentCard><ContentCard title="Remboursement ou échange"><p>Après contrôle du retour, un échange ou un remboursement est traité selon l’accord confirmé avec le service client. Les frais de retour restent à la charge du client, sauf erreur de préparation ou défaut constaté.</p><p>Le délai dépend du mode de règlement et du transport retour.</p></ContentCard></div><SupportCta /></PageShell>;
}

const legalPages = {
  cgv: {
    eyebrow: 'Cadre contractuel', title: 'Conditions générales de vente', intro: 'Les règles applicables aux commandes passées sur LXLunettes.',
    sections: [
      ['1. Objet et acceptation', 'Les présentes conditions encadrent la vente en ligne des produits présentés sur LXLunettes. La confirmation d’une commande implique leur acceptation sans réserve.'],
      ['2. Produits', 'Les caractéristiques essentielles, photographies et prix sont présentés sur chaque fiche. Les couleurs peuvent légèrement varier selon l’écran. Les offres restent valables dans la limite des stocks disponibles.'],
      ['3. Prix et paiement', 'Les prix sont affichés en dirhams marocains (MAD). Le montant total est récapitulé avant confirmation. Les modalités de validation ou de paiement sont confirmées avec le service client via WhatsApp.'],
      ['4. Commande', 'La commande devient enregistrée après validation du formulaire. Un numéro unique est généré : il doit être conservé et utilisé dans toute communication. LXLunettes peut refuser une commande manifestement erronée, frauduleuse ou impossible à livrer.'],
      ['5. Livraison', 'Les délais annoncés sont estimatifs et commencent après validation de la commande. Le client est responsable de l’exactitude de l’adresse et du numéro de téléphone communiqués.'],
      ['6. Retours', 'Toute demande doit être signalée dans les 7 jours suivant la réception et respecter les conditions détaillées sur la page Retours. Les garanties légales applicables aux défauts restent réservées.'],
      ['7. Responsabilité', 'LXLunettes ne répond pas des retards dus à une adresse incorrecte, une indisponibilité du client, un événement de force majeure ou un incident du transporteur hors de son contrôle raisonnable.'],
      ['8. Droit applicable', 'Les présentes conditions sont régies par le droit marocain. Une solution amiable est recherchée avant toute action auprès des juridictions compétentes.'],
    ],
  },
  privacy: {
    eyebrow: 'Vos données', title: 'Politique de confidentialité', intro: 'Comment vos informations sont utilisées et protégées sur LXLunettes.',
    sections: [
      ['Données collectées', 'Nous traitons les informations nécessaires au compte et à la commande : identité, e-mail, téléphone, adresse, ville, contenu du panier, historique de commande et messages adressés au service client.'],
      ['Finalités', 'Ces données servent à créer et sécuriser votre compte, préparer et livrer vos commandes, assurer le service après-vente, prévenir la fraude et respecter nos obligations légales.'],
      ['Base et durée de conservation', 'Les données de commande sont traitées pour exécuter le contrat et conservées pendant la durée nécessaire au suivi commercial et aux obligations comptables. Les données de compte restent disponibles jusqu’à sa suppression, sous réserve des obligations légales.'],
      ['Destinataires', 'L’accès est limité à LXLunettes et aux prestataires indispensables : authentification et base de données, hébergement, messagerie, WhatsApp et transport. Ils ne reçoivent que les informations nécessaires à leur mission.'],
      ['Sécurité', 'Les mots de passe sont gérés par le service d’authentification et ne sont pas visibles par LXLunettes. Les accès administrateur sont protégés par mot de passe, code à usage unique et session limitée.'],
      ['Vos droits', `Vous pouvez demander l’accès, la rectification ou la suppression de vos données en écrivant à ${CONTACT_EMAIL}. Certaines informations de commande peuvent être conservées lorsqu’une obligation légale l’exige.`],
      ['Cookies et stockage local', 'Le site utilise le stockage du navigateur pour maintenir la session, le panier et les préférences d’affichage. Les services d’authentification peuvent déposer les éléments techniques nécessaires à la connexion.'],
    ],
  },
  notices: {
    eyebrow: 'Informations du site', title: 'Mentions légales', intro: 'Identification, responsabilité et propriété intellectuelle.',
    sections: [
      ['Éditeur', `LXLunettes est une boutique en ligne exploitée au Maroc. Contact : ${CONTACT_EMAIL} · WhatsApp : +212 779 524 872.`],
      ['Direction de la publication', 'La direction de la publication est assurée par l’exploitant de LXLunettes. Les informations administratives complètes sont communiquées sur demande légitime via le service client.'],
      ['Hébergement et services techniques', 'Le site utilise une infrastructure d’hébergement web et Supabase pour certains services de données et d’authentification. Les prestataires peuvent évoluer sans modifier les droits des utilisateurs.'],
      ['Propriété intellectuelle', 'La structure, les textes, éléments graphiques et signes propres à LXLunettes sont protégés. Les marques et visuels de produits appartiennent à leurs titulaires respectifs et sont utilisés pour identifier les articles proposés.'],
      ['Exactitude et disponibilité', 'Nous corrigeons les erreurs signalées et cherchons à maintenir le site accessible. Une interruption temporaire peut intervenir pour maintenance, sécurité ou incident technique.'],
      ['Contact légal', `Pour toute demande relative au site, aux contenus ou aux données personnelles : ${CONTACT_EMAIL}.`],
    ],
  },
} as const;

function LegalPage({ page }: { page: keyof typeof legalPages }) {
  const content = legalPages[page];
  return <PageShell eyebrow={content.eyebrow} title={content.title} intro={content.intro}><p className="mb-8 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Dernière mise à jour : 22 juillet 2026</p><div className="space-y-5">{content.sections.map(([title, body]) => <ContentCard key={title} title={title}><p>{body}</p></ContentCard>)}</div><SupportCta /></PageShell>;
}

export function TermsPage() { return <LegalPage page="cgv" />; }
export function PrivacyPage() { return <LegalPage page="privacy" />; }
export function LegalNoticesPage() { return <LegalPage page="notices" />; }

function SupportCta() {
  const whatsappNumber = useWhatsAppNumber();
  return <div className="mt-10 flex flex-col items-center justify-between gap-5 border border-primary/25 bg-primary/5 p-7 text-center sm:flex-row sm:text-left"><div><p className="font-serif text-xl">Besoin d’une réponse personnalisée ?</p><p className="mt-1 text-sm text-muted-foreground">Notre service client vous répond sur WhatsApp.</p></div><Button asChild className="shrink-0 uppercase tracking-widest"><a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> Nous contacter</a></Button></div>;
}
