import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ParticleField } from "@/components/effects/ParticleField";
import { CursorGlow } from "@/components/effects/CursorGlow";
import { HeroScene } from "@/components/three/HeroScene";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { DishaLogo } from "@/components/DishaLogo";

function DishaLogoInline() {
  return <DishaLogo size={32} showText={false} dark={true} />;
}

const search = z.object({ tab: z.enum(["login", "signup"]).catch("login") });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  component: AuthPage,
});

function AuthPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(tab);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });

  useEffect(() => { if (!loading && user) navigate({ to: "/onboarding" }); }, [user, loading, navigate]);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: form.fullName.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Welcome to Disha AI!");
          navigate({ to: "/onboarding" });
        } else {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
          if (signInErr) {
            toast.success("Account created! Please sign in.");
            setMode("login");
          } else {
            toast.success("Welcome to Disha AI!");
            navigate({ to: "/onboarding" });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/onboarding" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally { setBusy(false); }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/onboarding",
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-night text-night-foreground">
      <CursorGlow />
      <div className="absolute inset-0 grid-bg-dark opacity-30" />
      <ParticleField density={40} />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:px-12">
        {/* Left visual */}
        <div className="relative hidden aspect-square w-full lg:block">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.35),transparent_60%)] blur-3xl" />
          <HeroScene />
        </div>

        {/* Auth card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="mx-auto w-full max-w-md rounded-3xl border border-white/10 glass-dark p-8 shadow-[0_30px_120px_-30px_rgba(99,102,241,0.55)]">
          <div className="mb-6 flex items-center gap-2">
            <DishaLogoInline />
            <div>
              <h1 className="text-lg font-semibold">Welcome to Disha AI</h1>
              <p className="text-xs text-white/60">Map your skills. Plan your future.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative mb-6 flex rounded-full border border-white/10 bg-white/5 p-1">
            <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full gradient-aurora-bg"
              style={{ left: mode === "login" ? 4 : "calc(50% + 0px)" }} />
            {(["login", "signup"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setMode(t)}
                className={`relative z-10 flex-1 rounded-full py-2 text-sm font-medium transition-colors ${mode === t ? "text-white" : "text-white/60"}`}>
                {t === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25 }} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <Field icon={<UserIcon className="h-4 w-4" />} label="Full name">
                      <input required value={form.fullName} onChange={upd("fullName")} placeholder="Arjit Tripathi" className="auth-input" />
                    </Field>
                    <Field icon={<Mail className="h-4 w-4" />} label="Email">
                      <input required type="email" value={form.email} onChange={upd("email")} placeholder="arjit@example.com" className="auth-input" />
                    </Field>
                    <Field icon={<Lock className="h-4 w-4" />} label="Password">
                      <div className="relative">
                        <input required type={showPw ? "text" : "password"} value={form.password} onChange={upd("password")} placeholder="••••••••" className="auth-input pr-10" />
                        <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field icon={<Lock className="h-4 w-4" />} label="Confirm password">
                      <input required type={showPw ? "text" : "password"} value={form.confirm} onChange={upd("confirm")} placeholder="••••••••" className="auth-input" />
                    </Field>

                  </>
                )}
                {mode === "login" && (
                  <>
                    <Field icon={<Mail className="h-4 w-4" />} label="Email">
                      <input required type="email" value={form.email} onChange={upd("email")} placeholder="you@example.com" className="auth-input" />
                    </Field>
                    <Field icon={<Lock className="h-4 w-4" />} label="Password">
                      <div className="relative">
                        <input required type={showPw ? "text" : "password"} value={form.password} onChange={upd("password")} placeholder="••••••••" className="auth-input pr-10" />
                        <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <MagneticButton type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Sign In" : "Create Account"}
            </MagneticButton>

            <div className="flex items-center gap-3 py-2 text-xs text-white/40">
              <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
            </div>

            <button type="button" disabled={busy} onClick={onGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50">
              <GoogleIcon /> Continue with Google
            </button>
          </form>
        </motion.div>
      </div>

      <style>{`.auth-input{width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);padding:10px 14px;color:#fff;outline:none;transition:all .25s;font-size:14px}
      .auth-input:focus{border-color:#8B5CF6;background:rgba(139,92,246,0.07);box-shadow:0 0 0 4px rgba(139,92,246,0.18)}
      .auth-input::placeholder{color:rgba(255,255,255,0.35)}`}</style>
    </main>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/70">{icon}{label}</span>
      {children}
    </label>
  );
}
function GoogleIcon() {
  return (<svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.4 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.5 35 26.9 36 24 36c-5.4 0-9.9-3.6-11.5-8.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C41.4 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>);
}
