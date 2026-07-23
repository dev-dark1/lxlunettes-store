import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCcw, Send, ShieldCheck } from "lucide-react";
import { LXLogo } from "@/components/LXLogo";
import { adminApi } from "@/lib/adminApi";

type Step = "login" | "sending" | "otp";

export default function AdminLogin() {
  const { toast } = useToast();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "";
  const [step, setStep] = useState<Step>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(adminEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  const maskedEmail = adminEmail
    ? adminEmail.replace(/^(.{3})(.*)(@.*)$/, (_match: string, start: string, middle: string, domain: string) => `${start}${"*".repeat(middle.length)}${domain}`)
    : "l’adresse administrateur configurée";

  useEffect(() => {
    const token = localStorage.getItem("lxlunettes_admin_token");
    if (!token) return;
    adminApi.get("/api/admin/auth/me")
      .then(() => { window.location.href = "/admin"; })
      .catch(() => localStorage.removeItem("lxlunettes_admin_token"));
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const finishLogin = (token: string) => {
    if (!token) throw new Error("Le serveur n’a pas renvoyé de session administrateur.");
    localStorage.setItem("lxlunettes_admin_token", token);
    toast({ title: "Accès autorisé", description: "Bienvenue dans l’espace administration." });
    window.location.href = "/admin";
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await adminApi.post("/api/admin/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      finishLogin(data.token);
    } catch (error: any) {
      toast({ title: "Connexion refusée", description: error.message || "Email ou mot de passe incorrect.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (countdown > 0) return;
    setStep("sending");
    setLoading(true);
    try {
      await adminApi.post("/api/admin/auth/send-otp", {});
      setOtp("");
      setStep("otp");
      setCountdown(60);
      toast({ title: "Code envoyé", description: `Vérifiez la boîte de réception et les spams de ${maskedEmail}.` });
    } catch (error: any) {
      setStep("login");
      toast({ title: "Code non envoyé", description: error.message || "Le service e-mail est indisponible.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await adminApi.post("/api/admin/auth/login-with-otp", { otp });
      finishLogin(data.token);
    } catch (error: any) {
      toast({ title: "Code refusé", description: error.message || "Code incorrect ou expiré.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      <div className="mb-10 relative z-10"><LXLogo /></div>
      <Card className="w-full max-w-sm bg-card/95 backdrop-blur border-border shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-2 border-b border-border pb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-primary">
            {step === "login" ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <CardTitle className="text-2xl font-serif tracking-widest uppercase">
            {step === "login" ? "Administration" : "Vérification"}
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-widest">
            {step === "login" ? "Accès sécurisé" : "Code envoyé par e-mail"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="bg-background border-border pl-9 h-11" placeholder="admin@exemple.com" autoComplete="email" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Mot de passe</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} className="bg-background border-border pl-9 pr-10 h-11" placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full py-6 uppercase tracking-[0.2em] font-bold" disabled={loading || !email || !password}>
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
              <button type="button" onClick={handleSendOtp} className="block mx-auto text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">
                Recevoir un code OTP
              </button>
            </form>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Send className="w-8 h-8 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground text-center">Envoi sécurisé du code à <strong className="text-foreground">{maskedEmail}</strong>…</p>
            </div>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed p-3 bg-muted/30 border border-border">
                Saisissez le code à 6 chiffres reçu à<br /><strong className="text-foreground">{maskedEmail}</strong>
              </p>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Code de vérification</label>
                <Input inputMode="numeric" pattern="[0-9]{6}" required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="bg-background border-border h-12 text-center font-bold tracking-[0.5em] text-lg" placeholder="000000" autoComplete="one-time-code" autoFocus />
              </div>
              <Button type="submit" className="w-full py-6 uppercase tracking-[0.2em] font-bold" disabled={loading || otp.length !== 6}>
                {loading ? "Vérification…" : "Valider le code"}
              </Button>
              <div className="flex flex-col items-center gap-3 pt-2">
                <button type="button" onClick={handleSendOtp} disabled={countdown > 0 || loading} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary disabled:opacity-50">
                  <RefreshCcw className="w-3 h-3" />{countdown > 0 ? `Renvoyer (${countdown}s)` : "Renvoyer le code"}
                </button>
                <button type="button" onClick={() => setStep("login")} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-3 h-3" /> Retour au login
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
