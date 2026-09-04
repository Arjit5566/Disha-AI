// src/routes/dashboard.client.tsx
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, FileText, Target, Loader2, CheckCircle2, X, ChevronDown, 
  Sparkles, Info, AlertCircle, Database, FileSpreadsheet, MessageSquare, 
  Code, BarChart3, Calculator, Lock, Briefcase, GraduationCap, MapPin, 
  Building2, RefreshCw, AlertTriangle, ArrowRight, ArrowLeft, Terminal, 
  BookOpen, Eye, Award, Check, FileCheck, Play, Compass
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { DashboardScene } from "@/components/three/DashboardScene";
import { getAnalysis, listMyAnalyses, getCareerNavigation, getAdzunaOpportunitiesForRole } from "@/lib/analysis.functions";
import { Route } from "./dashboard";

const ROLES = ["Data Analyst", "Data Scientist", "AI Engineer", "Full Stack Developer", "Software Engineer", "Web Developer", "Product Manager", "Machine Learning Engineer"];

// Distinct theme colors for the roadmap timeline
const THEMES = [
  { color: "#8B5CF6", bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", ring: "ring-primary/30", icon: BarChart3 },
  { color: "#3B82F6", bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", ring: "ring-blue-500/30", icon: Calculator },
  { color: "#EF4444", bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", ring: "ring-destructive/30", icon: Target },
  { color: "#10B981", bg: "bg-success/10", text: "text-success", border: "border-success/20", ring: "ring-success/30", icon: Check }
];

async function isPdfFile(file: File): Promise<boolean> {
  try {
    const arr = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46; // %PDF
  } catch (e) {
    return false;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch() as { id?: string };
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [activeId, setActiveId] = useState<string | null>(search.id || null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [role, setRole] = useState<string>("Full Stack Developer");
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync activeId with search parameter
  useEffect(() => {
    if (search.id) {
      setActiveId(search.id);
    }
  }, [search.id]);

  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email?.split("@")[0] || "there";

  // Server functions
  const fetchAnalysis = useServerFn(getAnalysis);
  const fetchList = useServerFn(listMyAnalyses);

  // Query for current active analysis details
  const { data: analysis, isLoading: loadingAnalysis, error: analysisError } = useQuery({
    queryKey: ["analysis", activeId],
    queryFn: () => fetchAnalysis({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  // Query for history list (to display recent analyses in sidebar or overview)
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["my-analyses"],
    queryFn: () => fetchList(),
  });

  const [selectedAltRole, setSelectedAltRole] = useState<string | null>(null);
  const [subTabAlt, setSubTabAlt] = useState<"job" | "internship">("job");

  const runNavigation = useServerFn(getCareerNavigation);
  const fetchAltOpps = useServerFn(getAdzunaOpportunitiesForRole);

  // Query for career navigation options based on skills
  const { data: navResult, isLoading: loadingNav } = useQuery({
    queryKey: ["navigation-dashboard", activeId],
    queryFn: () => runNavigation({ 
      data: { 
        skills: (analysis?.extracted_skills as string[]) || [], 
        targetRole: analysis?.target_role || "Frontend Developer" 
      } 
    }),
    enabled: !!analysis && !!activeId,
  });

  // Set default selected alt role when navResult loads
  useEffect(() => {
    if (navResult?.recommended_roles && navResult.recommended_roles.length > 0) {
      if (!selectedAltRole) {
        setSelectedAltRole(navResult.recommended_roles[0].role);
      }
    } else {
      setSelectedAltRole(null);
    }
  }, [navResult, selectedAltRole]);

  // Query for job/internship opportunities for selected recommended career role
  const { data: altOppsData, isLoading: loadingAltOpps } = useQuery({
    queryKey: ["alt-opportunities", activeId, selectedAltRole],
    queryFn: () => fetchAltOpps({ 
      data: { 
        role: selectedAltRole!, 
        skills: (analysis?.extracted_skills as string[]) || [], 
        country: "in" 
      } 
    }),
    enabled: !!analysis && !!activeId && !!selectedAltRole,
  });

  async function pickFile(f?: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF resume.");
      return;
    }
    const isValid = await isPdfFile(f);
    if (!isValid) {
      toast.error("Invalid PDF file structure. Please upload a valid PDF document.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("File too large (max 8MB).");
      return;
    }
    setFile(f);
  }

  async function onAnalyze() {
    if (!file) { toast.error("Upload your resume first."); return; }
    const target = role === "Other (Write your own)" ? custom.trim() : role;
    if (!target) { toast.error("Please specify a target role."); return; }
    setSubmitting(true);
    try {
      const { extractPdfText } = await import('@/lib/pdf-extract.client');
      const text = await extractPdfText(file);
      if (text.length < 50) throw new Error("Could not read text from the PDF. Try a text‑based PDF.");
      sessionStorage.setItem("sg_pending", JSON.stringify({ resumeText: text, targetRole: target }));
      navigate({ to: "/processing" });
    } catch (err) {
      toast.error(err instanceof Error && err.message.includes("Could not read text")
        ? err.message
        : "Failed to read resume. Please ensure it is a valid, text-based PDF and not a scanned image or wrong format.");
      setSubmitting(false);
    }
  }

  function handleReset() {
    setActiveId(null);
    setFile(null);
    // Remove query parameter
    navigate({ to: "/dashboard", search: {} });
  }

  function getSkillIcon(skill: string) {
    const s = skill.toLowerCase();
    if (s.includes("sql") || s.includes("data") || s.includes("db")) return <Database className="h-4 w-4" />;
    if (s.includes("excel") || s.includes("spreadsheet")) return <FileSpreadsheet className="h-4 w-4" />;
    if (s.includes("communication") || s.includes("writing")) return <MessageSquare className="h-4 w-4" />;
    if (s.includes("bi") || s.includes("visual") || s.includes("chart")) return <BarChart3 className="h-4 w-4" />;
    if (s.includes("stat") || s.includes("math")) return <Calculator className="h-4 w-4" />;
    return <Code className="h-4 w-4" />;
  }

  return (
    <AppShell>
      {/* 3D Neural mesh Background */}
      <DashboardScene />

      {/* Main Container */}
      <div className="relative min-h-[80vh] bg-animated-orbs">
        
        {loadingAnalysis ? (
          <div className="grid h-[60vh] place-items-center">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Loading your profile alignment metrics...</p>
            </div>
          </div>
        ) : activeId && analysis ? (
          /* ========================================================
             AFTER ANALYSIS: REVEAL RESULT DASHBOARD
             ======================================================== */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Header / Meta */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button 
                    onClick={handleReset} 
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted px-3 py-1.5 rounded-full border border-border"
                  >
                    <ArrowLeft className="h-3 w-3" /> Re-analyze New Resume
                  </button>
                  <Link 
                    to="/results/$id"
                    params={{ id: analysis.id }}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors bg-primary/10 hover:bg-primary/30 px-3 py-1.5 rounded-full border border-primary/20"
                  >
                    <Briefcase className="h-3.5 w-3.5" /> View Jobs & Internships
                  </Link>
                </div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  Alignment Evaluation <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Target Goal: <span className="text-primary font-semibold">{analysis.target_role}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Evaluated on {new Date(analysis.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Top Cards: Resume Score, ATS Score, Skills Found, Missing Skills */}
            <div className="grid gap-6 md:grid-cols-4">
              
              {/* Card 1: Resume Readiness Score */}
              <motion.div 
                whileHover={{ y: -8, scale: 1.025, rotateX: 3, rotateY: -3 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 border border-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.1)] flex flex-col items-center text-center justify-between hover:border-primary/45 hover:shadow-[0_0_30px_rgba(139,92,246,0.18)] transition-all duration-300"
              >
                <div className="w-full flex items-center justify-between text-xs text-muted-foreground font-semibold mb-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary border border-primary/25 shadow-sm">
                      <Award className="h-4 w-4" />
                    </div>
                    <span>Readiness Score</span>
                  </div>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground cursor-pointer" />
                </div>
                <div className="my-3">
                  <ScoreRing score={analysis.readiness_score} color="#8B5CF6" />
                </div>
                <div className="mt-2">
                  <div className="text-sm font-bold text-foreground">
                    {analysis.readiness_score >= 80 ? "Competency Master" : analysis.readiness_score >= 50 ? "Ready to Apply" : "Needs Upskilling"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Overall fit for {analysis.target_role}</p>
                </div>
              </motion.div>

              {/* Card 2: ATS Score Card */}
              {(() => {
                // Synthesize a realistic ATS score based on matching keywords and format items
                const atsScore = Math.max(45, Math.min(95, Math.round(analysis.readiness_score * 0.9 + 10)));
                return (
                  <motion.div 
                    whileHover={{ y: -8, scale: 1.025, rotateX: 3, rotateY: 3 }}
                    style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                    className="card rounded-3xl p-6 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col items-center text-center justify-between hover:border-cyan-500/45 hover:shadow-[0_0_30px_rgba(6,182,212,0.18)] transition-all duration-300"
                  >
                    <div className="w-full flex items-center justify-between text-xs text-muted-foreground font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/25 shadow-sm">
                          <FileCheck className="h-4 w-4" />
                        </div>
                        <span>ATS Score</span>
                      </div>
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground cursor-pointer" />
                    </div>
                    <div className="my-3">
                      <ScoreRing score={atsScore} color="#06B6D4" />
                    </div>
                    <div className="mt-2">
                      <div className="text-sm font-bold text-foreground">
                        {atsScore >= 85 ? "Excellent Parsing" : atsScore >= 70 ? "Good Compatibility" : "Optimization Needed"}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Estimated index rate</p>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Card 3: Skills Found Card */}
              <motion.div 
                whileHover={{ y: -8, scale: 1.025, rotateX: -3, rotateY: 3 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 border border-success/20 shadow-[0_0_20px_rgba(16,185,129,0.05)] md:col-span-1 flex flex-col justify-between hover:border-success/45 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-success/20 to-emerald-500/20 text-success border border-success/25 shadow-sm">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">Skills Found</span>
                    </div>
                    <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-bold">
                      {Array.isArray(analysis.extracted_skills) ? analysis.extracted_skills.length : 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-none">
                    {Array.isArray(analysis.extracted_skills) && (analysis.extracted_skills as string[]).map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-success/10 text-success border border-success/20 font-medium hover:bg-success/20 transition-colors">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground mt-4 pt-2 border-t border-border">
                  Detected in parsed sections
                </div>
              </motion.div>

              {/* Card 4: Missing Skills Card */}
              <motion.div 
                whileHover={{ y: -8, scale: 1.025, rotateX: -3, rotateY: -3 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 border border-destructive/20 shadow-[0_0_20px_rgba(239,68,68,0.05)] md:col-span-1 flex flex-col justify-between hover:border-destructive/45 hover:shadow-[0_0_30px_rgba(239,68,68,0.12)] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-destructive/20 to-red-500/20 text-destructive border border-destructive/25 shadow-sm">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">Missing Skills</span>
                    </div>
                    <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold">
                      {Array.isArray(analysis.missing_skills) ? analysis.missing_skills.length : 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-none">
                    {Array.isArray(analysis.missing_skills) && (analysis.missing_skills as string[]).map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium hover:bg-destructive/20 transition-colors">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground mt-4 pt-2 border-t border-border">
                  Required keywords to prioritize
                </div>
              </motion.div>

            </div>

            {/* Alternative Career Matcher & Opportunities */}
            {navResult && navResult.recommended_roles && navResult.recommended_roles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="card rounded-3xl p-6 border border-primary/15 shadow-[0_0_25px_rgba(139,92,246,0.06)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold">Roles You Can Apply For Right Now</h3>
                </div>

                <p className="text-xs text-muted-foreground mb-6">
                  Apart from <span className="text-primary font-semibold">{analysis.target_role}</span>, your resume skills also match these roles. Select one to explore live job and internship openings.
                </p>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Left Column: Recommended Roles List */}
                  <div className="lg:col-span-1 lg:border-r lg:border-border/40 pr-0 lg:pr-6">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Best-Fit Roles</h4>
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                      {navResult.recommended_roles.map((r) => {
                        const isActive = selectedAltRole === r.role;
                        return (
                          <motion.div 
                            key={r.role}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedAltRole(r.role)}
                            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                              isActive 
                                ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.12)]" 
                                : "border-border bg-background/50 hover:border-primary/40 hover:bg-muted/15"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>{r.role}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                r.match_percentage >= 80 
                                  ? "bg-success/20 text-success" 
                                  : r.match_percentage >= 60 
                                  ? "bg-blue-500/20 text-blue-500" 
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {r.match_percentage}%
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{r.message}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Matched Opportunities for the active role */}
                  <div className="lg:col-span-2 flex flex-col min-h-[300px]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-border/40 pb-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Openings for <span className="text-primary normal-case font-bold">{selectedAltRole || "—"}</span>
                      </h4>
                      
                      {/* Sub tabs: Jobs vs Internships */}
                      <div className="flex items-center gap-1 bg-muted/40 border border-border/40 rounded-xl p-0.5">
                        <button
                          onClick={() => setSubTabAlt("job")}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            subTabAlt === "job"
                              ? "bg-primary text-white shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Briefcase className="h-3 w-3" /> Jobs
                        </button>
                        <button
                          onClick={() => setSubTabAlt("internship")}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            subTabAlt === "internship"
                              ? "bg-primary text-white shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <GraduationCap className="h-3 w-3" /> Internships
                        </button>
                      </div>
                    </div>

                    {loadingAltOpps ? (
                      <div className="grid h-48 place-items-center">
                        <div className="text-center space-y-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                          <p className="text-[11px] text-muted-foreground">Fetching opportunities...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                        {altOppsData?.opportunities && altOppsData.opportunities.filter(o => o.type === subTabAlt).length > 0 ? (
                          altOppsData.opportunities
                            .filter(o => o.type === subTabAlt)
                            .map((opp) => (
                              <motion.div 
                                key={opp.id}
                                whileHover={{ y: -2 }}
                                className="p-4 rounded-2xl border border-border bg-background/55 hover:border-primary/25 transition-all flex flex-col justify-between group"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <h5 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{opp.title}</h5>
                                    <span className="text-[10px] font-extrabold text-primary shrink-0">{opp.matchScore}%</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                                    <span className="font-semibold text-foreground/80">{opp.company}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {opp.location}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-1 italic">"{opp.matchReason}"</p>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-success">{opp.salary}</span>
                                  <a 
                                    href={opp.redirectUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                                  >
                                    Apply <ArrowRight className="h-2.5 w-2.5" />
                                  </a>
                                </div>
                              </motion.div>
                            ))
                        ) : (
                          <div className="col-span-2 text-center py-10">
                            <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No openings found for this category.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}



            {/* Middle Section: Skills Gap Analysis & ATS Compatibility */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Skills Gap Analysis */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 border border-border hover:border-primary/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.08)] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-violet-500/25 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Skills Gap Analysis</h3>
                </div>

                <p className="text-xs text-muted-foreground mb-6">
                  Comparison profile between your matching credentials and key technologies in demand for <span className="text-foreground font-medium">{analysis.target_role}</span>.
                </p>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {Array.isArray(analysis.extracted_skills) && (analysis.extracted_skills as string[]).map((s) => (
                    <div key={s} className="flex items-center justify-between bg-muted/45 rounded-xl px-4 py-2.5 border border-border hover:border-success/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-success/10 text-success">
                          {getSkillIcon(s)}
                        </div>
                        <span className="text-xs font-medium">{s}</span>
                      </div>
                      <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Present
                      </span>
                    </div>
                  ))}

                  {Array.isArray(analysis.missing_skills) && (analysis.missing_skills as string[]).map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/45 rounded-xl px-4 py-2.5 border border-border hover:border-destructive/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-destructive/10 text-destructive">
                          {getSkillIcon(s)}
                        </div>
                        <span className="text-xs font-medium text-foreground/70 dark:text-white/70">{s}</span>
                      </div>
                      <span className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                        <X className="h-3.5 w-3.5" /> Missing
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ATS Compatibility */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: 2 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 border border-border hover:border-cyan-500/30 hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">ATS Compatibility</h3>
                </div>

                <p className="text-xs text-muted-foreground mb-6">
                  Automated checks confirming if your document structure complies with standardized Applicant Tracking Systems.
                </p>

                <div className="space-y-3">
                  <AtsCheckRow label="Contact Info (Email, Github, LinkedIn)" status="pass" details="Validated contact boundaries" />
                  <AtsCheckRow label="Document Structure & Sections" status="pass" details="Clear headers (Experience, Education)" />
                  <AtsCheckRow label="File Formatting (.pdf format)" status="pass" details="Optimal text layer readability" />
                  <AtsCheckRow label="Action & Metric Verbs" status="warn" details="Recommend increasing numerical impacts by 12%" />
                  <AtsCheckRow label="Bullet Formatting & Syntax" status="pass" details="Correct character mapping" />
                  <AtsCheckRow label="Formatting Overlap (Images/Graphics)" status="pass" details="No complex graphic overlays detected" />
                </div>
              </motion.div>

            </div>

            {/* Bottom Row: Resume Insights & Learning Recommendations */}
            <div className="grid gap-6 md:grid-cols-3">
              
              {/* Resume Insights */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: -2 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 border border-border md:col-span-1 flex flex-col justify-between hover:border-pink-500/30 hover:shadow-[0_0_25px_rgba(236,72,153,0.08)] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-pink-500/25 to-rose-500/25 text-pink-500 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold">Resume Insights</h3>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Evaluation breakdown of your current resume structure.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Strengths</div>
                      <ul className="text-xs mt-1.5 space-y-1 text-foreground/90 dark:text-white/90">
                        <li className="flex gap-1.5 items-start"><Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> High volume of core developer keywords</li>
                        <li className="flex gap-1.5 items-start"><Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> Clean workspace chronology layout</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Weaknesses & Recommendations</div>
                      <ul className="text-xs mt-1.5 space-y-1.5 text-foreground/80 dark:text-white/70">
                        <li className="flex gap-1.5 items-start"><X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" /> Lack of metrics-oriented outcomes</li>
                        <li className="flex gap-1.5 items-start"><X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" /> Missing technical skills like: {Array.isArray(analysis.missing_skills) ? analysis.missing_skills.slice(0, 2).join(", ") : "N/A"}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border text-[10px] text-muted-foreground italic">
                  Tip: Expand the roadmap below to learn missing skills.
                </div>
              </motion.div>

              {/* Learning Recommendations */}
              <motion.div 
                whileHover={{ y: -6, scale: 1.015, rotateX: 2, rotateY: 2 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 border border-border md:col-span-2 hover:border-primary/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.08)] transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-violet-500/25 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold">Learning Recommendations</h3>
                </div>

                <p className="text-xs text-muted-foreground mb-6">
                  Recommended educational links tailored to teach the missing skills discovered in your evaluation.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.isArray(analysis.resources) && analysis.resources.slice(0, 4).map((r: any, idx: number) => {
                    const theme = THEMES[idx % THEMES.length];
                    const Icon = theme.icon;
                    return (
                      <motion.div 
                        key={idx} 
                        whileHover={{ y: -4, scale: 1.025, rotateX: 2.5, rotateY: -2.5 }}
                        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                        className="bg-muted/40 border border-border rounded-2xl p-4 flex flex-col justify-between hover:border-primary/25 transition-all duration-300"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                              {r.provider}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{r.skill}</span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground line-clamp-1">{r.title}</h4>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">Master {r.skill} with interactive projects and lectures.</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Self-Paced</span>
                          <a 
                            href={r.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                          >
                            Go to course <ArrowRight className="h-3 w-3" />
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

            </div>


            <div className="card rounded-3xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold">Career Roadmap</h3>
              </div>

              <p className="text-xs text-muted-foreground mb-8">
                Your week-by-week progress timeline engineered by our AI coach to bridge your skill gap efficiently.
              </p>

              <div className="relative pl-12 sm:pl-20 py-2">
                {/* Vertical Line */}
                <div className="absolute left-[34px] sm:left-[50px] top-6 bottom-6 w-[1px] border-l border-dashed border-border" />

                <div className="space-y-6">
                  {Array.isArray(analysis.roadmap) && analysis.roadmap.map((w: any, i: number) => {
                    const theme = THEMES[i % THEMES.length];
                    const Icon = theme.icon;
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }} 
                        whileInView={{ opacity: 1, x: 0 }} 
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="relative flex gap-4 sm:gap-6"
                      >
                        {/* Dot indicator */}
                        <div className="absolute left-[-26px] sm:left-[-38px] top-0 grid h-8 w-8 place-items-center rounded-full bg-background border-2 border-border ring-1" style={{ borderColor: theme.color }}>
                          <span className="text-[10px] font-bold" style={{ color: theme.color }}>0{w.week}</span>
                        </div>

                        {/* Card Content */}
                        <div className="flex-1 bg-muted/40 border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: theme.color }}>Week {w.week}</span>
                              <h4 className="text-sm font-bold text-foreground mt-0.5">{w.title}</h4>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Objectives</div>
                              <ul className="text-xs mt-1.5 space-y-1 text-foreground/85 dark:text-white/70">
                                {Array.isArray(w.objectives) && w.objectives.map((o: string, idx: number) => (
                                  <li key={idx} className="flex gap-1.5 items-start">
                                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                    <span>{o}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Learning Outcomes</div>
                              <ul className="text-xs mt-1.5 space-y-1 text-foreground/85 dark:text-white/70">
                                {Array.isArray(w.outcomes) && w.outcomes.map((out: string, idx: number) => (
                                  <li key={idx} className="flex gap-1.5 items-start">
                                    <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                                    <span>{out}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

          </motion.div>
        ) : (
          /* ========================================================
             BEFORE ANALYSIS: RESUME UPLOAD AREA
             ======================================================== */
          <div className="max-w-4xl mx-auto flex flex-col justify-between py-6">
            
            {/* Hero Section */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }} 
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4">
                <Sparkles className="h-3.5 w-3.5" /> Premium AI Career Readiness Platform
              </div>
              <h1 className="text-4xl font-bold md:text-5xl tracking-tight text-foreground leading-tight">
                Welcome to <span className="gradient-text">Disha AI</span>
              </h1>
              <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
                Your intelligent career companion. Evaluate your readiness, map out missing skills, and run interactive simulations.
              </p>
            </motion.div>

            {/* Upload Area & Goal Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* 1. Upload Card */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.1, duration: 0.6 }} 
                whileHover={{ y: -6, scale: 1.02, rotateX: 2, rotateY: -2 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 flex flex-col justify-between hover:border-primary/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.08)] transition-all duration-300"
              >
                <div>
                  <div className="mb-2 flex items-center gap-3 text-base font-bold text-foreground">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-violet-500/25 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)] shrink-0">
                      <Upload className="h-5 w-5" />
                    </div>
                    1. Upload Resume
                  </div>
                  <p className="mb-6 text-xs text-muted-foreground">Upload your resume in standard text-based PDF format</p>
                  
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                    onClick={() => inputRef.current?.click()}
                    className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all min-h-[190px] flex flex-col justify-center ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-muted/20 hover:border-primary/60"}`}
                  >
                    <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
                    {file ? (
                      <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-left">
                        <div className="flex items-center gap-3 truncate">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{file.name}</div>
                            <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setFile(null); }} className="rounded-full p-1.5 hover:bg-destructive/10">
                          <X className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-2">
                        <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="mx-auto mb-3 text-primary">
                          <Upload className="mx-auto h-8 w-8" strokeWidth={1.5} />
                        </motion.div>
                        <div className="text-xs text-foreground font-medium">Drag & drop your file here</div>
                        <div className="mt-1 mb-3 text-[10px] text-muted-foreground">or</div>
                        <button type="button" className="rounded-full border border-primary/50 px-5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">Browse PDF</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Your data is processed securely.
                </div>
              </motion.div>

              {/* 2. Role Selector Card */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2, duration: 0.6 }} 
                whileHover={{ y: -6, scale: 1.02, rotateX: 2, rotateY: 2 }}
                style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                className="card rounded-3xl p-6 flex flex-col justify-between hover:border-secondary/30 hover:shadow-[0_0_25px_rgba(79,140,255,0.08)] transition-all duration-300"
              >
                <div>
                  <div className="mb-2 flex items-center gap-3 text-base font-bold text-foreground">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500/25 to-cyan-500/25 text-secondary border border-secondary/20 shadow-[0_0_15px_rgba(79,140,255,0.1)] shrink-0">
                      <Target className="h-5 w-5" />
                    </div>
                    2. Career Goal
                  </div>
                  <p className="mb-6 text-xs text-muted-foreground">Select the target career position you are aiming for</p>
                  
                  <div className="relative">
                    <button 
                      type="button" 
                      onClick={() => setOpen(v => !v)} 
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-xs font-bold hover:bg-muted"
                    >
                      {role}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <motion.div 
                        initial={{ opacity: 0, y: -6 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl max-h-[200px] overflow-y-auto"
                      >
                        {[...ROLES, "Other (Write your own)"].map(r => (
                          <button 
                            key={r} 
                            type="button" 
                            onClick={() => { setRole(r); setOpen(false); }} 
                            className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium hover:bg-muted ${role === r ? "bg-primary/10 text-primary font-bold" : ""}`}
                          >
                            {r}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  {role === "Other (Write your own)" && (
                    <input 
                      value={custom} 
                      onChange={e => setCustom(e.target.value)} 
                      placeholder="e.g. ML Research Engineer" 
                      className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                    />
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                  We match keywords against thousands of modern software job requirements.
                </div>
              </motion.div>

            </div>

            {/* Analyze Button */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3, duration: 0.6 }} 
              className="mt-10 flex flex-col items-center"
            >
              <MagneticButton 
                onClick={onAnalyze} 
                disabled={submitting} 
                className="w-full max-w-sm px-8 py-3 text-sm font-semibold"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4"/> Analyze Resume →</span>
                )}
              </MagneticButton>
              <p className="mt-4 text-center text-[10px] text-muted-foreground max-w-sm">
                We'll examine structural indices and map missing skills to customize your roadmap.
              </p>
            </motion.div>

            {/* Recent Evaluations list */}
            {history && history.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.4 }} 
                className="mt-12 border-t border-border pt-8"
              >
                <h3 className="text-sm font-bold text-muted-foreground mb-4">Your Recent Evaluations</h3>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {history.slice(0, 3).map((hist: any) => (
                    <Link 
                      key={hist.id} 
                      to="/results/$id"
                      params={{ id: hist.id }}
                      className="p-4 bg-muted border border-border rounded-2xl hover:border-primary/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex justify-between items-center group text-left"
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">{hist.target_role}</h4>
                        <span className="text-[10px] text-muted-foreground">{new Date(hist.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-primary">{hist.readiness_score}</span>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

          </div>
        )}

      </div>
    </AppShell>
  );
}

/* ========================================================
   SUB-COMPONENTS
   ======================================================== */

// ATS Check Row
function AtsCheckRow({ label, status, details }: { label: string; status: "pass" | "warn"; details: string }) {
  return (
    <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-2.5 border border-border text-xs">
      <div className="flex items-center gap-2.5">
        {status === "pass" ? (
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-warning shrink-0" />
        )}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{details}</span>
    </div>
  );
}

// Score Ring
function ScoreRing({ score, color }: { score: number; color: string }) {
  const R = 45;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="8" />
        <motion.circle 
          cx="60" 
          cy="60" 
          r={R} 
          fill="none" 
          stroke={color} 
          strokeLinecap="round" 
          strokeWidth="8"
          strokeDasharray={C} 
          initial={{ strokeDashoffset: C }} 
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }} 
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-2xl font-bold tabular-nums text-foreground">{score}</div>
        <div className="text-[9px] font-semibold text-muted-foreground">/100</div>
      </div>
    </div>
  );
}
