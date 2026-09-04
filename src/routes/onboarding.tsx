import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import {
  Brain, FileText, Target, BookOpen, Briefcase, GraduationCap,
  FileCheck, TrendingUp, ArrowRight, Sparkles, Star, Zap, ChevronRight,
  MapPin, DollarSign, Clock, CheckCircle, Play
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

// --- Floating Particle ---
function Particle({ x, y, size, duration, delay, color }: { x: number; y: number; size: number; duration: number; delay: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: "blur(1px)" }}
      animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// --- Animated Grid Background ---
function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      <motion.div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)",
        backgroundSize: "120px 120px",
      }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 4, repeat: Infinity }} />
    </div>
  );
}

// --- Blob ---
function Blob({ className, color1, color2, duration = 8 }: { className: string; color1: string; color2: string; duration?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none blur-[100px] opacity-30 ${className}`}
      style={{ background: `radial-gradient(circle, ${color1}, ${color2})` }}
      animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// --- AI Robot ---
function AIRobot() {
  return (
    <motion.div
      className="relative w-48 h-48 mx-auto"
      animate={{ y: [0, -15, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Orbital rings */}
      {[70, 90, 110].map((r, i) => (
        <motion.div key={i} className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}>
          <div className="rounded-full border border-purple-500/30" style={{ width: r * 2, height: r * 2 }}>
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)] -translate-y-full ml-[48%]" />
          </div>
        </motion.div>
      ))}
      {/* Body */}
      <div className="absolute inset-8 rounded-3xl glass-dark border border-violet-500/40 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.4)]">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Brain className="w-10 h-10 text-violet-400" />
        </motion.div>
        <div className="mt-2 flex gap-1">
          {[0, 0.2, 0.4].map((d, i) => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, delay: d, repeat: Infinity }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const FEATURES = [
  { icon: FileText, title: "Resume Analysis", desc: "AI extracts skills, projects, education, certifications and experience.", color: "#8B5CF6", glow: "rgba(139,92,246,0.3)" },
  { icon: Target, title: "Skill Gap Detection", desc: "Compare your resume with industry requirements and identify missing skills.", color: "#06B6D4", glow: "rgba(6,182,212,0.3)" },
  { icon: BookOpen, title: "Learning Recommendations", desc: "Recommend courses, certifications, roadmaps and learning resources.", color: "#10B981", glow: "rgba(16,185,129,0.3)" },
  { icon: TrendingUp, title: "Career Guidance", desc: "Provide role suggestions and career growth insights.", color: "#F59E0B", glow: "rgba(245,158,11,0.3)" },
  { icon: Briefcase, title: "Job Recommendations", desc: "Find relevant jobs based on resume analysis, skills and career goals.", color: "#EF4444", glow: "rgba(239,68,68,0.3)" },
  { icon: GraduationCap, title: "Internship Matching", desc: "Suggest internships suitable for current skills and experience level.", color: "#8B5CF6", glow: "rgba(139,92,246,0.3)" },
  { icon: FileCheck, title: "ATS Optimization", desc: "Improve ATS score and increase your interview chances.", color: "#06B6D4", glow: "rgba(6,182,212,0.3)" },
  { icon: Zap, title: "Progress Tracking", desc: "Track skill growth and career development over time.", color: "#F59E0B", glow: "rgba(245,158,11,0.3)" },
];

const STEPS = [
  { n: "01", title: "Upload Resume", desc: "Upload your PDF resume securely.", icon: FileText },
  { n: "02", title: "AI Analysis", desc: "Extract skills, projects, education and experience.", icon: Brain },
  { n: "03", title: "Skill Gap Analysis", desc: "Identify missing skills for your desired role.", icon: Target },
  { n: "04", title: "Career Intelligence", desc: "Generate personalized career insights.", icon: Sparkles },
  { n: "05", title: "Learning Paths", desc: "Recommend courses and certifications.", icon: BookOpen },
  { n: "06", title: "Job & Internship Match", desc: "Find matching opportunities based on your profile.", icon: Briefcase },
  { n: "07", title: "ATS Optimization", desc: "Improve resume quality and ATS score.", icon: FileCheck },
  { n: "08", title: "Achieve Goals", desc: "Track progress and land better opportunities.", icon: Star },
];

const JOBS = [
  { title: "Senior React Developer", company: "TechCorp India", match: 94, salary: "₹18-28 LPA", location: "Bangalore", type: "Full-time", skills: ["React", "TypeScript", "Node.js"] },
  { title: "Frontend Engineer", company: "StartupXYZ", match: 88, salary: "₹12-20 LPA", location: "Remote", type: "Full-time", skills: ["Vue.js", "CSS", "GraphQL"] },
  { title: "React Internship", company: "InnovateTech", match: 91, salary: "₹25K/mo", location: "Mumbai", type: "Internship", skills: ["React", "JavaScript"] },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeJob, setActiveJob] = useState(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveJob(j => (j + 1) % JOBS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, duration: Math.random() * 4 + 3,
    delay: Math.random() * 2,
    color: ["rgba(139,92,246,0.6)", "rgba(6,182,212,0.6)", "rgba(167,139,250,0.6)"][i % 3],
  })), []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#050714] text-white overflow-x-hidden">
      {/* Mouse glow */}
      <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-300" style={{
        background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139,92,246,0.06), transparent 50%)`,
      }} />

      <GridBg />
      <Blob className="w-[500px] h-[500px] -top-40 -left-40" color1="rgba(139,92,246,0.6)" color2="transparent" duration={10} />
      <Blob className="w-[400px] h-[400px] top-1/3 -right-40" color1="rgba(6,182,212,0.5)" color2="transparent" duration={8} />
      <Blob className="w-[300px] h-[300px] bottom-0 left-1/3" color1="rgba(99,102,241,0.4)" color2="transparent" duration={12} />

      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-aurora-bg flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">Disha AI</span>
        </div>
        <button onClick={() => navigate({ to: "/dashboard" })}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
          Skip intro <ChevronRight className="w-4 h-4" />
        </button>
      </nav>

      {/* ── HERO ── */}
      <motion.section style={{ y: heroY }} className="relative z-10 px-6 pt-20 pb-32 text-center max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" /> Powered by Advanced AI
        </motion.div>

        <AIRobot />

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
          className="mt-10 text-5xl md:text-7xl font-bold leading-tight tracking-tight">
          What is{" "}
          <span className="gradient-text">Disha AI?</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-6 text-lg md:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
          Disha AI is your intelligent career companion that analyzes your resume, identifies skill gaps,
          recommends personalized learning paths, and helps you discover jobs and internships that match your profile.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button onClick={() => navigate({ to: "/dashboard" })}
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl gradient-aurora-bg font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:-translate-y-1 hover:shadow-[0_0_50px_rgba(139,92,246,0.7)] transition-all duration-300">
            Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/15 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
            <Play className="w-4 h-4" /> Watch Demo
          </button>
        </motion.div>

        {/* Stats strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[["10K+", "Users"], ["95%", "Accuracy"], ["500+", "Companies"]].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-2xl font-bold gradient-text">{n}</div>
              <div className="text-xs text-white/40 mt-1">{l}</div>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Everything you need to <span className="gradient-text">accelerate</span> your career</h2>
          <p className="mt-4 text-white/50 text-lg max-w-2xl mx-auto">Eight powerful AI-driven features working together to transform your career journey.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group relative p-6 rounded-3xl border border-white/8 glass-dark cursor-default overflow-hidden"
              style={{ boxShadow: `0 0 0 0 ${f.glow}` }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 30px ${f.glow}`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 0 0 transparent")}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 transition-opacity group-hover:opacity-20"
                style={{ background: `radial-gradient(circle, ${f.color}, transparent)` }} />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}>
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">How <span className="gradient-text">Disha AI</span> works</h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto">Eight intelligent steps to transform your career trajectory.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="relative p-6 rounded-3xl border border-white/8 glass-dark group hover:border-violet-500/40 transition-all duration-300">
              <div className="text-5xl font-black text-violet-500/15 group-hover:text-violet-500/25 transition-colors mb-4 font-mono">{s.n}</div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-3">
                <s.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-bold text-white mb-1.5">{s.title}</h3>
              <p className="text-xs text-white/50">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="w-5 h-5 text-violet-500/40" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── JOB MATCHER ── */}
      <section className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" /> AI-Powered Opportunity Finder
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">Jobs & Internships <span className="gradient-text">matched for you</span></h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto">Real-time recommendations based on your unique skill profile.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {JOBS.map((job, i) => (
            <motion.div key={job.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className={`relative p-6 rounded-3xl border glass-dark transition-all duration-300 cursor-pointer ${activeJob === i ? "border-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.2)]" : "border-white/8 hover:border-violet-500/30"}`}
              onClick={() => setActiveJob(i)}>
              {/* Match badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-bold">
                <Sparkles className="w-3 h-3" /> {job.match}% Match
              </div>
              <div className="mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.type === "Internship" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"}`}>
                  {job.type}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">{job.title}</h3>
              <p className="text-sm text-white/50 mb-4">{job.company}</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-white/50"><MapPin className="w-3.5 h-3.5 text-violet-400" />{job.location}</div>
                <div className="flex items-center gap-2 text-xs text-white/80 font-semibold"><DollarSign className="w-3.5 h-3.5 text-cyan-400" />{job.salary}</div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {job.skills.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded text-xs bg-white/5 border border-white/10 text-white/60">{s}</span>
                ))}
              </div>
              {/* Match bar */}
              <div className="w-full h-1.5 rounded-full bg-white/10 mb-4">
                <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#8B5CF6,#06B6D4)" }}
                  initial={{ width: 0 }} whileInView={{ width: `${job.match}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }} />
              </div>
              <button onClick={() => navigate({ to: "/dashboard" })}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-colors">
                Apply Now <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 py-32 text-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.8), rgba(6,182,212,0.4))" }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
            <Star className="w-4 h-4" /> Start your journey today
          </div>
          <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Your Career Journey <br /><span className="gradient-text">Starts Here</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-12">
            Disha AI helps students and professionals discover their strengths, improve their skills,
            find jobs and internships, and achieve their dream careers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => navigate({ to: "/dashboard" })}
              className="group flex items-center gap-2 px-10 py-4 rounded-2xl gradient-aurora-bg font-bold text-white text-lg shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:-translate-y-1 hover:shadow-[0_0_60px_rgba(139,92,246,0.8)] transition-all duration-300">
              Get Started Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link to="/dashboard"
              className="flex items-center gap-2 px-10 py-4 rounded-2xl border border-white/20 bg-white/5 text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
              Explore Opportunities
            </Link>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-white/40">
            {["No credit card required", "Free to start", "AI-powered insights"].map((t, i) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-violet-400" /> {t}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-xs text-white/30">
        © 2025 Disha AI • Intelligent Career Guidance Platform
      </footer>
    </div>
  );
}
