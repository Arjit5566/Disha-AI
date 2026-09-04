import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ClientOnly } from "@tanstack/react-router";
import { DishaLogo } from "@/components/DishaLogo";

// other imports remain unchanged
import { CursorGlow } from "@/components/effects/CursorGlow";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { ParticleField } from "@/components/effects/ParticleField";
import { HeroScene } from "@/components/three/HeroScene";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Disha AI — Guiding Careers Through Intelligence" },
    { name: "description", content: "AI-powered career readiness platform. Upload your resume, pick a role, get a personalized learning roadmap." },
    { property: "og:title", content: "Disha AI" },
    { property: "og:description", content: "Guiding Careers Through Intelligence" },
  ]}),
  component: Landing,
});

function Landing() {
  return (
    <main suppressHydrationWarning className="relative min-h-screen overflow-hidden bg-night text-night-foreground">
      <ClientOnly fallback={null}>
        <CursorGlow />
        <div className="absolute inset-0 grid-bg-dark opacity-30" />
        <ParticleField density={50} />
      </ClientOnly>

      {/* Nav */}
      <motion.header initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        className="relative z-20 flex items-center justify-between px-6 py-6 md:px-12">
        {/* Nav Logo */}
        <Link to="/dashboard" className="flex items-center">
          <DishaLogo size={48} showText={true} dark={true} animate3d={false} />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/auth" search={{ tab: "login" }} className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">Log in</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="rounded-full gradient-primary-bg px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">Sign up</Link>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-6 pb-24 text-center">
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.8 }}
          className="mb-10 flex justify-center">
          <DishaLogo size={100} showText={false} dark={true} animate3d={true} />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
          className="text-5xl font-bold tracking-tight text-white md:text-7xl">
          Disha <span style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-3 text-sm font-semibold uppercase tracking-[0.4em] text-white/60 md:text-base">
          Guiding Careers Through Intelligence
        </motion.p>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.8 }}
          className="mt-8 text-lg text-white/80 md:text-xl">
          Discover your skill gaps.<br />
          Build your <span className="text-primary font-medium">future.</span>
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/auth" search={{ tab: "login" }} className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-white/10">
            Log in <ArrowRight className="h-4 w-4 text-white/60" />
          </Link>
          <Link to="/auth" search={{ tab: "signup" }} className="flex items-center gap-3 rounded-2xl gradient-primary-bg px-8 py-3.5 text-base font-medium text-white transition-opacity hover:opacity-90">
            Sign up <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 flex flex-col items-center gap-3 text-white/40">
          <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/20 p-1">
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest">Scroll to explore</span>
        </motion.div>
      </section>
    </main>
  );
}
