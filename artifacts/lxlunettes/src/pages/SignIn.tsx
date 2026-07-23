import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'recovery';

const authMessage = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (normalized.includes('email not confirmed')) return 'Confirmez d’abord votre adresse e-mail depuis le message reçu.';
  if (normalized.includes('rate limit')) return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  return message;
};

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>(() => window.location.hash.includes('type=recovery') ? 'recovery' : 'login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        toast({ title: 'Connexion réussie', description: 'Heureux de vous revoir.' });
        setLocation('/profil');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/sign-in` },
      });
      if (error) throw error;
      if (data.session) {
        toast({ title: 'Compte créé', description: 'Votre espace client est prêt.' });
        setLocation('/profil');
      } else {
        toast({ title: 'Confirmez votre e-mail', description: 'Un lien de confirmation vient de vous être envoyé. Vérifiez aussi vos spams.' });
        setMode('login');
      }
    } catch (error: any) {
      toast({ title: 'Authentification impossible', description: authMessage(error.message || 'Une erreur est survenue.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/sign-in`,
      });
      if (error) throw error;
      toast({ title: 'E-mail envoyé', description: 'Ouvrez le lien de récupération reçu dans Gmail. Vérifiez également les spams.' });
      setMode('login');
    } catch (error: any) {
      toast({ title: 'Envoi impossible', description: authMessage(error.message || 'Réessayez dans quelques instants.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Mot de passe trop court', description: 'Utilisez au moins 8 caractères.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Confirmation différente', description: 'Les deux mots de passe doivent être identiques.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Mot de passe mis à jour', description: 'Vous pouvez maintenant accéder à votre profil.' });
      setLocation('/profil');
    } catch (error: any) {
      toast({ title: 'Mise à jour impossible', description: authMessage(error.message || 'Le lien a peut-être expiré.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/profil` },
      });
      if (error) throw error;
    } catch (error: any) {
      setLoading(false);
      toast({ title: 'Connexion Google impossible', description: authMessage(error.message || 'Réessayez.'), variant: 'destructive' });
    }
  };

  const title = mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : mode === 'forgot' ? 'Mot de passe oublié' : 'Nouveau mot de passe';
  const subtitle = mode === 'login' ? 'Accédez à votre espace personnel' : mode === 'signup' ? 'Créez votre espace client sécurisé' : mode === 'forgot' ? 'Recevez un lien de récupération par e-mail' : 'Choisissez un mot de passe sécurisé';

  return (
    <div className="min-h-[80vh] flex items-center justify-center container mx-auto px-4 py-16 relative">
      <div className="absolute w-[420px] h-[420px] bg-primary/5 blur-[110px] rounded-full pointer-events-none" />
      <div className="w-full max-w-md bg-card/95 backdrop-blur border border-border p-8 rounded-sm shadow-2xl relative">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
          {mode === 'forgot' ? <Mail className="w-5 h-5" /> : mode === 'recovery' ? <KeyRound className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
        </div>
        <h1 className="text-3xl font-serif mb-2 text-center">{title}</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">{subtitle}</p>

        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="votre@email.com" autoComplete="email" />
            <Button type="submit" disabled={loading || !email} className="w-full py-6 uppercase tracking-widest font-bold">{loading ? 'Envoi…' : 'Envoyer le lien'}</Button>
          </form>
        ) : mode === 'recovery' ? (
          <form onSubmit={handleRecovery} className="space-y-5">
            <PasswordInput label="Nouveau mot de passe" value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} autoComplete="new-password" />
            <AuthInput label="Confirmer le mot de passe" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" autoComplete="new-password" />
            <Button type="submit" disabled={loading || !password || !confirmPassword} className="w-full py-6 uppercase tracking-widest font-bold">{loading ? 'Mise à jour…' : 'Enregistrer le mot de passe'}</Button>
          </form>
        ) : (
          <>
            <form onSubmit={handleCredentials} className="space-y-4 mb-6">
              <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="votre@email.com" autoComplete="email" />
              <PasswordInput label="Mot de passe" value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <Button type="submit" disabled={loading || !email || password.length < 6} className="w-full py-6 mt-4 uppercase tracking-widest font-bold">{loading ? 'Patientez…' : mode === 'login' ? 'Se connecter' : "S’inscrire"}</Button>
            </form>

            {mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="block mx-auto mb-6 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">Mot de passe oublié ?</button>}
            <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-card px-2 text-muted-foreground">Ou</span></div></div>
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={loading} className="w-full border-border hover:bg-muted">
              <GoogleIcon /> Continuer avec Google
            </Button>
            <div className="mt-8 text-center text-sm text-muted-foreground">
              {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-primary hover:underline font-medium">{mode === 'login' ? "S’inscrire" : 'Se connecter'}</button>
            </div>
          </>
        )}

        {(mode === 'forgot' || mode === 'recovery') && (
          <button type="button" onClick={() => setMode('login')} className="mt-7 mx-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"><ArrowLeft className="w-3 h-3" /> Retour à la connexion</button>
        )}
      </div>
    </div>
  );
}

function AuthInput({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  return <div className="space-y-2"><label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label><Input required value={value} onChange={(event) => onChange(event.target.value)} className="bg-background border-border" {...props} /></div>;
}

function PasswordInput({ label, value, onChange, show, setShow, autoComplete }: { label: string; value: string; onChange: (value: string) => void; show: boolean; setShow: (show: boolean) => void; autoComplete: string }) {
  return <div className="space-y-2"><label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label><div className="relative"><Input type={show ? 'text' : 'password'} required value={value} onChange={(event) => onChange(event.target.value)} className="bg-background border-border pr-10" placeholder="••••••••" autoComplete={autoComplete} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShow(!show)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>;
}

function GoogleIcon() {
  return <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>;
}
