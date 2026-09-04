import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { analyzeResume } from "@/lib/analysis.functions";
import { AuthGate } from "@/components/AuthGate";
import { ParticleField } from "@/components/effects/ParticleField";
import { CursorGlow } from "@/components/effects/CursorGlow";
import { ProcessingOrb } from "@/components/three/ProcessingOrb";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { 
  Sparkles, Home, Activity, Map, FileText, User, 
  LogOut, ChevronDown, Brain, Scale, Check 
} from "lucide-react";

const STAGES = [
  { pct: 25, label: "Reading Resume" },
  { pct: 50, label: "Extracting Skills" },
  { pct: 75, label: "Comparing Skills" },
  { pct: 100, label: "Generating Roadmap" },
];

export const Route = createFileRoute("/processing")({
  head: () => ({ meta: [{ title: "Analyzing — DISHA AI" }] }),
  component: () => <AuthGate><Processing /></AuthGate>,
});

function Processing() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const analyze = useServerFn(analyzeResume);
  const [progress, setProgress] = useState(8);
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email?.split("@")[0] || "User";
  const initial = name.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const raw = sessionStorage.getItem("sg_pending");
    if (!raw) { navigate({ to: "/dashboard" }); return; }
    const { resumeText, targetRole } = JSON.parse(raw) as { resumeText: string; targetRole: string };

    // Animate progress while AI runs
    const tick = setInterval(() => {
      setProgress((p) => {
        const next = p + (95 - p) * 0.06;
        const nextStage = next >= 75 ? 3 : next >= 50 ? 2 : next >= 25 ? 1 : 0;
        setStage(nextStage);
        return Math.min(next, 95);
      });
    }, 160);

    analyze({ data: { resumeText, targetRole } })
      .then((res) => {
        clearInterval(tick);
        setProgress(100);
        setStage(3);
        sessionStorage.removeItem("sg_pending");
        setTimeout(() => navigate({ to: "/results/$id", params: { id: res.id } }), 700);
      })
      .catch((err: Error) => {
        clearInterval(tick);
        toast.error(err.message || "Analysis failed");
        navigate({ to: "/dashboard" });
      });

    return () => clearInterval(tick);
  }, [analyze, navigate]);

  return (
    <div className="relative flex min-h-screen bg-night text-night-foreground overflow-hidden">
      <CursorGlow />
      <div className="absolute inset-0 grid-bg-dark opacity-25 pointer-events-none" />
      <ParticleField density={40} />

      {/* 1. Left Sidebar */}
      <aside className="relative z-20 flex w-20 shrink-0 flex-col items-center justify-between border-r border-white/5 bg-[#080711]/50 py-6 backdrop-blur-md">
        <div className="flex flex-col items-center gap-8">
          {/* Logo */}
          <Link to="/dashboard" className="group flex flex-col items-center gap-1">
            <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary-bg shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold tracking-[0.15em] text-white">DISHA</span>
              <span className="text-[7px] font-semibold tracking-[0.2em] text-primary uppercase leading-none mt-0.5">AI</span>
            </div>
          </Link>

          {/* Navigation Buttons */}
          <nav className="flex flex-col items-center gap-5 mt-4">
            <Link to="/dashboard" className="group relative rounded-xl p-3 text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <Home className="h-5 w-5" />
            </Link>
            <div className="relative rounded-xl p-3 text-primary bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.25)]">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <Link to="/dashboard" className="group relative rounded-xl p-3 text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <Map className="h-5 w-5" />
            </Link>
            <Link to="/dashboard" className="group relative rounded-xl p-3 text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <FileText className="h-5 w-5" />
            </Link>
            <Link to="/profile" className="group relative rounded-xl p-3 text-white/40 hover:bg-white/5 hover:text-white transition-all">
              <User className="h-5 w-5" />
            </Link>
          </nav>
        </div>

        {/* Bottom Sign Out */}
        <button 
          onClick={handleSignOut} 
          className="rounded-xl p-3 text-white/40 hover:bg-destructive/10 hover:text-destructive transition-all"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      {/* 2. Main Content Area */}
      <div className="relative z-10 flex flex-1 flex-col justify-between py-6 px-8 md:px-12">
        {/* Top Header Row */}
        <header className="flex justify-end">
          <div className="flex items-center gap-2.5 rounded-full border border-white/5 bg-white/5 px-4 py-2 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="grid h-7 w-7 place-items-center rounded-full gradient-primary-bg text-[10px] font-bold text-white shadow-sm">
              {initial}
            </div>
            <span className="text-xs font-semibold text-white/80">{name}</span>
            <ChevronDown className="h-4 w-4 text-white/40" />
          </div>
        </header>

        {/* Center content */}
        <main className="flex flex-col items-center text-center my-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Analyzing your resume <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </h1>
            <p className="text-sm text-white/60 mt-1.5">
              This may take a few moments. Hang tight!
            </p>
          </motion.div>

          {/* 3D Canvas */}
          <div className="relative my-4 h-[320px] w-full max-w-[460px]">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.25),transparent_70%)] blur-3xl pointer-events-none" />
            <ProcessingOrb />
          </div>

          {/* Current Step Status */}
          <div className="h-16 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div 
                key={stage} 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center"
              >
                <span className="text-xl font-semibold text-white tracking-wide">{STAGES[stage].label}...</span>
                <span className="text-sm font-semibold text-primary mt-1">{Math.round(progress)}% complete</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* 3. Bottom Stages Timeline */}
        <footer className="w-full max-w-4xl mx-auto py-4">
          <div className="relative flex items-center justify-between">
            {/* Background Line */}
            <div className="absolute left-[6%] right-[6%] top-[24px] h-[2px] -translate-y-1/2 bg-white/5 border-t border-dashed border-white/10" />
            
            {/* Animated progress fill on the line */}
            <motion.div 
              className="absolute left-[6%] top-[24px] h-[2px] -translate-y-1/2 bg-gradient-to-r from-primary to-accent"
              initial={{ width: "0%" }}
              animate={{ width: `${(stage / 3) * 88}%` }}
              transition={{ duration: 0.4 }}
            />

            {/* Stages circles */}
            {STAGES.map((s, i) => {
              const isCompleted = i < stage;
              const isActive = i === stage;
              const isUpcoming = i > stage;
              
              let Icon = FileText;
              if (i === 1) Icon = Brain;
              if (i === 2) Icon = Scale;
              if (i === 3) Icon = Map;

              return (
                <div key={s.label} className="relative flex flex-col items-center flex-1 z-10">
                  {/* Outer circle wrapper with state styling */}
                  <motion.div 
                    className={`relative grid h-12 w-12 place-items-center rounded-full border-2 transition-all duration-300 ${
                      isCompleted 
                        ? "bg-primary/90 border-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]" 
                        : isActive 
                        ? "bg-night border-primary text-primary shadow-[0_0_20px_rgba(139,92,246,0.5)]" 
                        : "bg-night border-white/10 text-white/30"
                    }`}
                    animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                    transition={isActive ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </motion.div>
                  
                  {/* Title Label below circle */}
                  <span className={`mt-3 text-[10px] font-semibold tracking-wider text-center transition-colors duration-300 ${
                    isActive ? "text-primary font-bold" : isCompleted ? "text-white/80" : "text-white/40"
                  }`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </footer>
      </div>
    </div>
  );
}
