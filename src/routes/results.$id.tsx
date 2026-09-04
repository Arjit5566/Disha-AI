import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { 
  CheckCircle2, ArrowRight, Loader2, Sparkles, ArrowLeft, Info, 
  AlertCircle, Database, FileSpreadsheet, MessageSquare, Code, 
  BarChart3, Calculator, Target, Lock, FileText, Briefcase, 
  GraduationCap, Building2, MapPin, Globe, RefreshCw, AlertTriangle,
  Download, Star, Award, Zap, Compass, Brain
} from "lucide-react";
import { getAnalysis, getAdzunaOpportunities, getCareerNavigation, getAdzunaOpportunitiesForRole } from "@/lib/analysis.functions";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const Route = createFileRoute("/results/$id")({
  head: () => ({ meta: [{ title: "Analysis Result — Disha AI" }] }),
  component: () => <AuthGate><Results /></AuthGate>,
});

// Helper for generic icons
function getSkillIcon(skill: string) {
  const s = skill.toLowerCase();
  if (s.includes("sql") || s.includes("data")) return <Database className="h-4 w-4" />;
  if (s.includes("excel") || s.includes("spreadsheet")) return <FileSpreadsheet className="h-4 w-4" />;
  if (s.includes("communication") || s.includes("talk")) return <MessageSquare className="h-4 w-4" />;
  if (s.includes("bi") || s.includes("tableau") || s.includes("visual")) return <BarChart3 className="h-4 w-4" />;
  if (s.includes("stat") || s.includes("math")) return <Calculator className="h-4 w-4" />;
  return <Code className="h-4 w-4" />;
}

function Results() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchAnalysis = useServerFn(getAnalysis);
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => fetchAnalysis({ data: { id } }),
  });

  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email?.split("@")[0] || "there";

  const [activeTab, setActiveTab] = useState<"analysis" | "opportunities" | "suggested-resume">("analysis");
  const [selectedCountry, setSelectedCountry] = useState<string>("in");
  const [subTab, setSubTab] = useState<"job" | "internship">("job");
  const [selectedAltRole, setSelectedAltRole] = useState<string | null>(null);
  const [altSubTab, setAltSubTab] = useState<"job" | "internship">("job");

  const fetchOpportunities = useServerFn(getAdzunaOpportunities);
  const { data: oppData, isLoading: loadingOpps, error: oppsError, refetch: refetchOpps } = useQuery({
    queryKey: ["opportunities", id, selectedCountry],
    queryFn: () => fetchOpportunities({ data: { analysisId: id, country: selectedCountry } }),
    enabled: activeTab === "opportunities",
  });

  // Career navigation: recommended roles based on resume skills
  const runNavigation = useServerFn(getCareerNavigation);
  const { data: navResult, isLoading: loadingNav, error: navError } = useQuery({
    queryKey: ["career-nav-results", id],
    queryFn: () => runNavigation({
      data: {
        skills: (data?.extracted_skills as string[]) || [],
        targetRole: (data?.target_role as string) || "Software Engineer"
      }
    }),
    enabled: !!data,
  });

  useEffect(() => {
    if (navResult?.recommended_roles && navResult.recommended_roles.length > 0 && !selectedAltRole) {
      setSelectedAltRole(navResult.recommended_roles[0].role);
    }
  }, [navResult, selectedAltRole]);

  const fetchAltOpps = useServerFn(getAdzunaOpportunitiesForRole);
  const { data: altOppsData, isLoading: loadingAltOpps } = useQuery({
    queryKey: ["alt-opps-results", id, selectedAltRole],
    queryFn: () => fetchAltOpps({
      data: {
        role: selectedAltRole!,
        skills: (data?.extracted_skills as string[]) || [],
        country: "in"
      }
    }),
    enabled: !!data && !!selectedAltRole,
  });

  if (isLoading) return <AppShell><div className="grid h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  if (error || !data) return <AppShell><div className="grid h-[60vh] place-items-center text-destructive">Couldn't load results.</div></AppShell>;

  const found = (data.extracted_skills as string[]) || [];
  const missing = (data.missing_skills as string[]) || [];
  const score = data.readiness_score as number;
  const total = found.length + missing.length || 1;
  const currentPct = Math.round((found.length / total) * 100);
  const missingPct = Math.round((missing.length / total) * 100);
  
  const pieData = [
    { name: "Current Skills", value: currentPct, color: "#8B5CF6" },
    { name: "Missing Skills", value: missingPct, color: "#ef4444" },
  ];

  return (
    <AppShell>
      <div className="mb-8 flex items-start justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <button onClick={() => navigate({ to: "/dashboard" })} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">Analysis Result</h1>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-primary mt-1 text-sm font-medium">{data.target_role}</p>
        </motion.div>
               {/* Right side 3D icon placeholder - matched from screenshot */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hidden md:block relative h-24 w-24">
           <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.3),transparent_70%)] blur-2xl" />
           <div className="relative h-full w-full rounded-2xl border border-border bg-card backdrop-blur-md flex items-center justify-center rotate-12 transform shadow-xl">
             <BarChart3 className="h-10 w-10 text-primary opacity-80" />
           </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
        <h2 className="text-2xl font-bold">Great job, {name}! 👋</h2>
        <p className="mt-1 text-muted-foreground">Here's your skill gap analysis result.</p>
      </motion.div>

      {/* Sleek Tab Bar */}
      <div className="mb-8 flex border-b border-border overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "analysis"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain className="h-4 w-4 text-primary shrink-0" />
          Skill Analysis & Roadmap
        </button>
        <button
          onClick={() => setActiveTab("opportunities")}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "opportunities"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="h-4 w-4 text-primary shrink-0" />
          Job & Internship Matcher <Sparkles className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setActiveTab("suggested-resume")}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "suggested-resume"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4 text-primary shrink-0" />
          Suggested Resume
        </button>
      </div>

      {activeTab === "analysis" && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Score */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.15 }}
              whileHover={{ y: -8, scale: 1.025, rotateX: 3, rotateY: -3 }}
              style={{ transformStyle: "preserve-3d", perspective: 1000 }}
              className="card relative flex flex-col items-center rounded-3xl p-6 border border-primary/20 shadow-[0_0_30px_rgba(139,92,246,0.1)] hover:border-primary/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.18)] transition-all duration-300"
            >
              <div className="w-full flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-violet-500/25 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                    <Award className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">1. Career Readiness Score</h3>
                </div>
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </div>
              
              <div className="mt-6 flex flex-col items-center">
                <ScoreRing score={score} />
                <div className="mt-6 text-lg font-bold text-primary">{score >= 80 ? "Excellent Fit" : score >= 50 ? "Good Alignment" : "Needs Upskilling"}</div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> You're on the right track!
                </div>
              </div>
            </motion.div>

            {/* Found Skills */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.025, rotateX: 3, rotateY: 3 }}
              style={{ transformStyle: "preserve-3d", perspective: 1000 }}
              className="card rounded-3xl p-6 border border-success/20 shadow-[0_0_30px_rgba(16,185,129,0.05)] flex flex-col h-full hover:border-success/40 hover:shadow-[0_0_40px_rgba(16,185,129,0.12)] transition-all duration-300"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-success/25 to-emerald-500/25 text-success border border-success/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">2. Skills Found</h3>
                </div>
                <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-bold">
                  {found.length} Matches
                </span>
              </div>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[250px] scrollbar-none">
                {found.length === 0 && <span className="text-sm text-muted-foreground">None detected.</span>}
                {found.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-success/5 px-4 py-3 text-sm font-medium text-success ring-1 ring-success/15 hover:bg-success/10 transition-colors">
                    <div className="grid h-6 w-6 place-items-center rounded-md bg-success/20">
                      {getSkillIcon(s)}
                    </div>
                    {s}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Missing Skills */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.25 }}
              whileHover={{ y: -8, scale: 1.025, rotateX: -3, rotateY: 3 }}
              style={{ transformStyle: "preserve-3d", perspective: 1000 }}
              className="card rounded-3xl p-6 border border-destructive/20 shadow-[0_0_30px_rgba(239,68,68,0.05)] flex flex-col h-full hover:border-destructive/40 hover:shadow-[0_0_40px_rgba(239,68,68,0.12)] transition-all duration-300"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-destructive/25 to-red-500/25 text-destructive border border-destructive/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">3. Missing Skills</h3>
                </div>
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                  {missing.length} Gaps
                </span>
              </div>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[250px] scrollbar-none">
                {missing.length === 0 && <span className="text-sm text-muted-foreground">None detected.</span>}
                {missing.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive ring-1 ring-destructive/15 hover:bg-destructive/10 transition-colors">
                    <div className="grid h-6 w-6 place-items-center rounded-md bg-destructive/20">
                      {getSkillIcon(s)}
                    </div>
                    {s}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Overview Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            whileHover={{ y: -5, scale: 1.01 }}
            className="mt-6 card rounded-3xl p-6 border border-border/80 hover:border-primary/30 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.02)]"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-blue-500/25 text-cyan-500 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">4. Skill Match Overview</h3>
              </div>
              <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Chart area */}
              <div className="flex items-center gap-8 justify-center md:justify-start pl-4">
                <div className="h-[120px] w-[120px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={60} stroke="none">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color as string} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2 text-sm text-foreground"><span className="h-3 w-3 rounded-full bg-primary" /> Current Skills</div>
                    <div className="text-lg font-bold text-primary">{currentPct}%</div>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2 text-sm text-foreground"><span className="h-3 w-3 rounded-full bg-destructive" /> Missing Skills</div>
                    <div className="text-lg font-bold text-destructive">{missingPct}%</div>
                  </div>
                </div>
              </div>

              {/* Target callout */}
              <div className="flex items-center gap-4 rounded-2xl bg-muted/40 p-6 border border-border">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-foreground">You're {currentPct}% aligned with your goal!</div>
                  <div className="text-sm text-muted-foreground">Keep going, you're almost there!</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Roles You Can Apply For Right Now */}
          {loadingNav ? (
            <div className="mt-8 card rounded-3xl p-6 border border-primary/15 shadow-[0_0_25px_rgba(139,92,246,0.06)] animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <Compass className="h-5 w-5 text-primary/40" />
                <div className="h-6 bg-muted rounded w-48" />
              </div>
              <div className="h-4 bg-muted rounded w-96 mb-6" />
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted/60 rounded-2xl" />
                  ))}
                </div>
                <div className="lg:col-span-2 h-64 bg-muted/60 rounded-2xl animate-pulse" />
              </div>
            </div>
          ) : navError ? (
            <div className="mt-8 card rounded-3xl p-6 border border-destructive/20 text-center">
              <p className="text-sm text-destructive">Failed to load alternative career recommendations.</p>
            </div>
          ) : navResult && navResult.recommended_roles && navResult.recommended_roles.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="mt-8 card rounded-3xl p-6 border border-primary/15 shadow-[0_0_25px_rgba(139,92,246,0.06)]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-pink-500/25 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                  <Compass className="h-5 w-5 animate-spin-slow" />
                </div>
                <h3 className="text-lg font-bold">Roles You Can Apply For Right Now</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Apart from <span className="text-primary font-semibold">{data.target_role}</span>, your resume skills also match these roles. Select one to explore live openings.
              </p>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: Role list */}
                <div className="lg:col-span-1 lg:border-r lg:border-border/40 pr-0 lg:pr-6">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Best-Fit Roles</h4>
                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                    {navResult.recommended_roles.map((r) => {
                      const isActive = selectedAltRole === r.role;
                      return (
                        <motion.div
                          key={r.role}
                          whileHover={{ scale: 1.02, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedAltRole(r.role)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isActive
                              ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.12)]"
                              : "border-border bg-background/50 hover:border-primary/40 hover:bg-muted/15"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>{r.role}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              r.match_percentage >= 80
                                ? "bg-success/20 text-success"
                                : r.match_percentage >= 60
                                ? "bg-blue-500/20 text-blue-500"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {r.match_percentage}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.message}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Opportunities */}
                <div className="lg:col-span-2 flex flex-col min-h-[300px]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-border/40 pb-3">
                    <h4 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary shrink-0" />
                      Openings for <span className="text-primary font-bold">{selectedAltRole || "\u2014"}</span>
                    </h4>
                    <div className="flex items-center gap-1 bg-muted/40 border border-border/40 rounded-xl p-0.5">
                      <button
                        onClick={() => setAltSubTab("job")}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          altSubTab === "job" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Briefcase className="h-3.5 w-3.5" /> Jobs
                      </button>
                      <button
                        onClick={() => setAltSubTab("internship")}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          altSubTab === "internship" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <GraduationCap className="h-3.5 w-3.5" /> Internships
                      </button>
                    </div>
                  </div>

                  {loadingAltOpps ? (
                    <div className="grid h-48 place-items-center">
                      <div className="text-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                        <p className="text-xs text-muted-foreground">Fetching opportunities...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                      {altOppsData?.opportunities && altOppsData.opportunities.filter(o => o.type === altSubTab).length > 0 ? (
                        altOppsData.opportunities
                          .filter(o => o.type === altSubTab)
                          .map((opp) => (
                            <motion.div
                              key={opp.id}
                              whileHover={{ y: -4, scale: 1.025, rotateX: 2.5, rotateY: -2.5 }}
                              style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                              className="p-4 rounded-2xl border border-border bg-background/55 hover:border-primary/25 hover:shadow-[0_0_20px_rgba(139,92,246,0.06)] transition-all flex flex-col justify-between group"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h5 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{opp.title}</h5>
                                  <span className="text-xs font-extrabold text-primary shrink-0">{opp.matchScore}%</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                  <span className="font-semibold text-foreground/80">{opp.company}</span>
                                  <span>&bull;</span>
                                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {opp.location}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 italic">"{opp.matchReason}"</p>
                              </div>
                              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                                <span className="text-xs font-bold text-success">{opp.salary}</span>
                                <a href={opp.redirectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                                  Apply <ArrowRight className="h-3 w-3" />
                                </a>
                              </div>
                            </motion.div>
                          ))
                      ) : (
                        <div className="col-span-2 text-center py-10">
                          <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No openings found for this category.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="mt-8 card rounded-3xl p-6 border border-border text-center">
              <p className="text-sm text-muted-foreground">No alternative career recommendations found matching your resume skills.</p>
            </div>
          )}

          {/* Bottom Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} 
            className="mt-8 flex flex-col items-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                <FileText className="h-4 w-4" /> View Detailed Analysis
              </button>
              <Link to="/roadmap/$id" params={{ id }}
                className="group flex items-center gap-2 rounded-xl gradient-primary-bg px-8 py-3.5 text-sm font-medium text-white transition-all hover:opacity-90 shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:-translate-y-0.5">
                Get My Personalized Roadmap <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Roadmap will be tailored based on your skill gaps
            </div>
          </motion.div>
        </>
      )}

      {activeTab === "opportunities" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Country Selector & Sub-Tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-muted/40 border border-border rounded-3xl p-4">
            <div className="flex items-center gap-2 bg-background border border-border rounded-2xl p-1 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => setSubTab("job")}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  subTab === "job"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="h-4 w-4" /> Jobs
              </button>
              <button
                onClick={() => setSubTab("internship")}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  subTab === "internship"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-4 w-4" /> Internships
              </button>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-primary" /> Target Country:
              </span>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="bg-background border border-border rounded-2xl px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[160px]"
                >
                  {/* Expanded country options for Adzuna API */}
                  <option value="in">🇮🇳 India (INR)</option>
                  <option value="us">🇺🇸 United States (USD)</option>
                  <option value="gb">🇬🇧 United Kingdom (GBP)</option>
                  <option value="ca">🇨🇦 Canada (CAD)</option>
                  <option value="au">🇦🇺 Australia (AUD)</option>
                  <option value="de">🇩🇪 Germany (EUR)</option>
                  <option value="fr">🇫🇷 France (EUR)</option>
                  <option value="nl">🇳🇱 Netherlands (EUR)</option>
                  <option value="sg">🇸🇬 Singapore (SGD)</option>
                  <option value="ae">🇦🇪 United Arab Emirates (AED)</option>
                  <option value="jp">🇯🇵 Japan (JPY)</option>
                  <option value="br">🇧🇷 Brazil (BRL)</option>
                  <option value="mx">🇲🇽 Mexico (MXN)</option>
                  <option value="za">🇿🇦 South Africa (ZAR)</option>
                </select>
            </div>
          </div>

          {/* Alert for Mock Data */}
          {oppData?.isMock && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 p-5 flex items-start gap-4 shadow-xl"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-500">Demo Recommendations Mode</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  We are showing dynamic, high-fidelity suggestions customized to your target role and skills.
                  To see real-time job and internship postings, add your <code className="bg-muted px-1.5 py-0.5 rounded text-amber-500 font-mono">ADZUNA_APP_ID</code> and <code className="bg-muted px-1.5 py-0.5 rounded text-amber-500 font-mono">ADZUNA_APP_KEY</code> to the <code className="bg-muted px-1.5 py-0.5 rounded text-amber-500 font-mono">.env</code> file.
                </p>
              </div>
            </motion.div>
          )}

          {/* Loader State */}
          {loadingOpps && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card border border-border rounded-3xl p-6 h-[250px] animate-pulse flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-muted rounded-md w-1/3" />
                      <div className="h-6 bg-muted rounded-full w-20" />
                    </div>
                    <div className="h-6 bg-muted rounded-md w-3/4" />
                    <div className="space-y-2 mt-2">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-5/6" />
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded-xl w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {oppsError && (
            <div className="card border border-border rounded-3xl p-12 text-center flex flex-col items-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-bold">Failed to load postings</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-md">An error occurred while communicating with the Adzuna API search engine.</p>
              <button
                onClick={() => refetchOpps()}
                className="flex items-center gap-2 rounded-xl gradient-primary-bg px-6 py-3 text-xs font-bold text-white shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 animate-spin" /> Retry Fetch
              </button>
            </div>
          )}

          {/* Opportunities Cards Grid */}
          {!loadingOpps && !oppsError && (
            <>
              {(() => {
                const filtered = (oppData?.opportunities || []).filter(opp => opp.type === subTab);
                
                if (filtered.length === 0) {
                  return (
                    <div className="card border border-border rounded-3xl p-16 text-center">
                      <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-55" />
                      <h3 className="text-lg font-bold text-foreground">No matches in this region</h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                        We couldn't find any listings matching "{data.target_role}" in the selected region. Try changing the target country.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((opp, idx) => (
                      <motion.div
                        key={opp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ y: -6, scale: 1.025, rotateX: 2.5, rotateY: -2.5 }}
                        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                        className="card border border-border rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.12)] transition-all duration-300"
                      >
                        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none group-hover:from-primary/15 transition-all duration-300" />
                        
                        <div>
                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2 max-w-[60%]">
                              <div className="grid h-7 w-7 place-items-center rounded-lg bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 border border-border shrink-0">
                                <Building2 className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">
                                {opp.company}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold shrink-0">
                              <Sparkles className="h-3 w-3" /> {opp.matchScore}% Match
                            </div>
                          </div>

                          <h4 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-250 leading-snug">
                            {opp.title}
                          </h4>
                          
                          <div className="flex flex-col gap-2 mt-4">
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                              <MapPin className="h-4 w-4 text-muted-foreground/75" />
                              <span className="truncate">{opp.location}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-foreground/90 dark:text-white/90 font-bold">
                              <Building2 className="h-4 w-4 text-primary" />
                              <span>{opp.salary}</span>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mt-5 line-clamp-2 bg-muted/40 rounded-2xl p-4 border border-border italic relative">
                            {opp.matchReason}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            Posted {new Date(opp.created).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                          <a
                            href={opp.redirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover group/btn bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 transition-all duration-200"
                          >
                            Apply Now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </motion.div>
      )}

      {activeTab === "suggested-resume" && (
        <SuggestedResumeSection
          userName={name}
          userEmail={user?.email || ""}
          targetRole={data.target_role as string}
          summary={data.summary as string || ""}
          foundSkills={found}
          missingSkills={missing}
          score={score}
        />
      )}
    </AppShell>
  );
}

function ScoreRing({ score }: { score: number }) {
  const R = 60;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative grid h-40 w-40 place-items-center">
      <svg viewBox="0 0 200 200" className="-rotate-90">
        {/* Background track */}
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--border)" strokeWidth="16" />
        {/* Progress */}
        <motion.circle cx="100" cy="100" r={R} fill="none" stroke="url(#ringGrad2)" strokeLinecap="round" strokeWidth="16"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: "easeOut" }} />
        <defs>
          <linearGradient id="ringGrad2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-4xl font-bold tabular-nums text-foreground">{score}</div>
        <div className="text-sm font-medium text-muted-foreground">/100</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Suggested Resume Section — shows an ideal resume preview with all skills
   (found + missing) and provides PDF download.
   ───────────────────────────────────────────────────────────────────────────── */

interface SuggestedResumeProps {
  userName: string;
  userEmail: string;
  targetRole: string;
  summary: string;
  foundSkills: string[];
  missingSkills: string[];
  score: number;
}

function SuggestedResumeSection({
  userName,
  userEmail,
  targetRole,
  summary,
  foundSkills,
  missingSkills,
  score,
}: SuggestedResumeProps) {
  const allSkills = [...new Set([...foundSkills, ...missingSkills])];

  const handleDownloadPDF = useCallback(() => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    let y = 45;

    // ── Accent bar at top ──
    doc.setFillColor("#8B5CF6");
    doc.rect(0, 0, pageWidth, 6, "F");

    // ── Name ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor("#111827");
    doc.text(userName || "Your Name", margin, y);
    y += 22;

    // ── Target Role subtitle ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#8B5CF6");
    doc.text(targetRole, margin, y);
    y += 16;

    // ── Contact line ──
    doc.setFontSize(9);
    doc.setTextColor("#6B7280");
    const contactLine = [userEmail, "linkedin.com/in/yourprofile", "github.com/yourprofile"].filter(Boolean).join("  •  ");
    doc.text(contactLine, margin, y);
    y += 20;

    // ── Divider ──
    doc.setDrawColor("#E5E7EB");
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

    // ── Helper: section header ──
    const sectionHeader = (title: string) => {
      if (y > 760) { doc.addPage(); y = 45; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor("#8B5CF6");
      doc.text(title.toUpperCase(), margin, y);
      y += 4;
      doc.setDrawColor("#8B5CF6");
      doc.setLineWidth(1);
      doc.line(margin, y, margin + 50, y);
      y += 14;
    };

    // ── PROFESSIONAL SUMMARY ──
    sectionHeader("Professional Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#374151");
    const summaryText = summary || `Results-driven ${targetRole} professional with a strong foundation in modern technologies and a passion for building impactful solutions. Skilled in cross-functional collaboration and continuously expanding technical expertise.`;
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 13 + 16;

    // ── CORE SKILLS ──
    sectionHeader("Core Skills");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#374151");

    // Render skills in multi-column layout
    const colWidth = contentWidth / 3;
    allSkills.forEach((skill, i) => {
      if (y > 770) { doc.addPage(); y = 45; }
      const col = i % 3;
      const x = margin + col * colWidth;
      doc.setTextColor("#374151");
      doc.text(`• ${skill}`, x, y);
      if (col === 2 || i === allSkills.length - 1) y += 14;
    });
    y += 10;

    // ── SKILLS YOU SHOULD ADD (highlighted) ──
    if (missingSkills.length > 0) {
      sectionHeader("Skills to Add (Recommended)");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor("#DC2626");
      const missingText = missingSkills.join(", ");
      const missingLines = doc.splitTextToSize(`These skills are critical for the ${targetRole} role: ${missingText}`, contentWidth);
      doc.text(missingLines, margin, y);
      y += missingLines.length * 12 + 16;
    }

    // ── EXPERIENCE PLACEHOLDER ──
    sectionHeader("Professional Experience");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#111827");
    doc.text(`${targetRole}  •  [Company Name]`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#6B7280");
    doc.text("[Start Date] — Present", pageWidth - margin - doc.getTextWidth("[Start Date] — Present"), y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#374151");
    const bullets = [
      `Led development of [project/product] resulting in [quantifiable impact, e.g., 30% increase in performance].`,
      `Collaborated with cross-functional teams to deliver [feature/system] using ${foundSkills.slice(0, 3).join(", ") || "modern technologies"}.`,
      `Implemented best practices in ${missingSkills.slice(0, 2).join(" and ") || "emerging technologies"} to improve team productivity.`,
    ];
    bullets.forEach((b) => {
      if (y > 770) { doc.addPage(); y = 45; }
      const bLines = doc.splitTextToSize(`• ${b}`, contentWidth - 10);
      doc.text(bLines, margin + 10, y);
      y += bLines.length * 13;
    });
    y += 16;

    // ── EDUCATION PLACEHOLDER ──
    sectionHeader("Education");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#111827");
    doc.text("[Your Degree]  •  [University Name]", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#6B7280");
    doc.text("[Year of Graduation]", pageWidth - margin - doc.getTextWidth("[Year of Graduation]"), y);
    y += 24;

    // ── PROJECTS PLACEHOLDER ──
    sectionHeader("Key Projects");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#111827");
    doc.text("[Project Name]", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#374151");
    const projBullet = `Built a [type of project] leveraging ${allSkills.slice(0, 4).join(", ")} that [achieved specific result].`;
    const projLines = doc.splitTextToSize(`• ${projBullet}`, contentWidth - 10);
    doc.text(projLines, margin + 10, y);
    y += projLines.length * 13 + 10;

    // ── Footer ──
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(7);
    doc.setTextColor("#9CA3AF");
    doc.text("Generated by DISHA AI — Your Career Intelligence Platform", margin, footerY);
    doc.text(`Readiness Score: ${score}/100`, pageWidth - margin - doc.getTextWidth(`Readiness Score: ${score}/100`), footerY);

    doc.save(`DISHA-AI-Suggested-Resume-${targetRole.replace(/\s+/g, "_")}.pdf`);
    toast.success("Resume PDF downloaded!");
  }, [userName, userEmail, targetRole, summary, foundSkills, missingSkills, allSkills, score]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-violet-500/25 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)] shrink-0">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Your Resume Should Look Like This
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              An ideal resume for <span className="text-primary font-semibold">{targetRole}</span> with all recommended skills included.
            </p>
          </div>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="group flex items-center gap-2 rounded-xl gradient-primary-bg px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90 shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:-translate-y-0.5"
        >
          <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
          Download Resume PDF
        </button>
      </div>

      {/* Resume Preview Card — theme compliant style to match the app */}
      <motion.div 
        whileHover={{ y: -6, scale: 1.01, rotateX: 1.5, rotateY: -1.5 }}
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
        className="card rounded-3xl border border-border overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.08)] hover:border-primary/30 transition-all duration-300 bg-background/40"
      >

        {/* Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="p-8 md:p-10 space-y-8">

          {/* ── Name & Role Header ── */}
          <div className="border-b border-border pb-6">
            <h3 className="text-3xl font-black text-foreground tracking-tight">{userName || "Your Name"}</h3>
            <p className="text-primary font-semibold text-lg mt-1">{targetRole}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span>{userEmail || "your.email@example.com"}</span>
              <span>•</span>
              <span>linkedin.com/in/yourprofile</span>
              <span>•</span>
              <span>github.com/yourprofile</span>
            </div>
          </div>

          {/* ── Professional Summary ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Professional Summary</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary || `Results-driven ${targetRole} professional with a strong foundation in modern technologies and a passion for building impactful solutions. Skilled in cross-functional collaboration and continuously expanding technical expertise.`}
            </p>
          </div>

          {/* ── Core Skills Grid ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Core Skills</h4>
              <span className="ml-auto text-[10px] text-muted-foreground">{allSkills.length} skills</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {foundSkills.map((skill, i) => (
                <span
                  key={`f-${i}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-semibold ring-1 ring-success/20"
                >
                  <CheckCircle2 className="h-3 w-3" /> {skill}
                </span>
              ))}
              {missingSkills.map((skill, i) => (
                <span
                  key={`m-${i}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20 animate-pulse"
                >
                  <Zap className="h-3 w-3" /> {skill}
                  <span className="text-[9px] opacity-70 font-normal ml-0.5">NEW</span>
                </span>
              ))}
            </div>
          </div>

          {/* ── Experience Placeholder ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Professional Experience</h4>
            </div>
            <div className="card rounded-2xl p-5 border border-border space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-foreground">{targetRole}</h5>
                  <p className="text-xs text-muted-foreground">[Company Name]</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold bg-muted px-3 py-1 rounded-full">[Start] — Present</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Star className="h-3 w-3 text-primary mt-1 shrink-0" />
                  <span>Led development of [project/product] resulting in [quantifiable impact, e.g., 30% increase in performance].</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-3 w-3 text-primary mt-1 shrink-0" />
                  <span>Collaborated with cross-functional teams to deliver [feature/system] using {foundSkills.slice(0, 3).join(", ") || "modern technologies"}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-3 w-3 text-primary mt-1 shrink-0" />
                  <span>Implemented best practices in {missingSkills.slice(0, 2).join(" and ") || "emerging technologies"} to improve team productivity.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Education Placeholder ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Education</h4>
            </div>
            <div className="card rounded-2xl p-5 border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-foreground">[Your Degree]</h5>
                  <p className="text-xs text-muted-foreground">[University Name]</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold bg-muted px-3 py-1 rounded-full">[Year]</span>
              </div>
            </div>
          </div>

          {/* ── Key Projects Placeholder ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Key Projects</h4>
            </div>
            <div className="card rounded-2xl p-5 border border-border space-y-2 bg-muted/20">
              <h5 className="text-sm font-bold text-foreground">[Project Name]</h5>
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <Star className="h-3 w-3 text-primary mt-1 shrink-0" />
                Built a [type of project] leveraging {allSkills.slice(0, 4).join(", ")} that [achieved specific result].
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Generated by DISHA AI</span>
          <span className="text-[10px] text-muted-foreground">Readiness Score: <span className="text-primary font-bold">{score}/100</span></span>
        </div>
      </motion.div>

      {/* Tips callout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ y: -4, scale: 1.015, rotateX: 2, rotateY: -2 }}
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
        className="card rounded-2xl p-6 border border-primary/20 shadow-[0_0_30px_rgba(139,92,246,0.08)] hover:border-primary/45 transition-all duration-300"
      >
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Tips to Strengthen Your Resume
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            Replace all <span className="text-primary font-medium">[bracket placeholders]</span> with your real information after downloading.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            Add the <span className="text-primary font-medium">{missingSkills.length} missing skills</span> (marked with ⚡ NEW) by taking courses from your roadmap.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            Use action verbs and quantify achievements (e.g., "Increased performance by 40%").
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            Keep the resume to 1-2 pages maximum for optimal ATS compatibility.
          </li>
        </ul>
      </motion.div>

      {/* Second download CTA */}
      <div className="flex justify-center">
        <button
          onClick={handleDownloadPDF}
          className="group flex items-center gap-2 rounded-xl gradient-primary-bg px-8 py-4 text-sm font-bold text-white transition-all hover:opacity-90 shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:-translate-y-0.5"
        >
          <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
          Download Your Suggested Resume
        </button>
      </div>
    </motion.div>
  );
}
