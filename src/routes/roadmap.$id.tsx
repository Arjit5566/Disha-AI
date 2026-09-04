import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, ArrowRight, Sparkles, Check, BarChart3, Calculator, Target, Folder, Clock, Rocket, Map } from "lucide-react";
import { getAnalysis } from "@/lib/analysis.functions";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/roadmap/$id")({
  head: () => ({ meta: [{ title: "Your Roadmap — Disha AI" }] }),
  component: () => <AuthGate><Roadmap /></AuthGate>,
});

interface Week { week: number; title: string; objectives: string[]; outcomes: string[]; description?: string }
interface Resource { title: string; provider: string; url: string; skill: string; tag?: string; duration?: string; level?: string }

// Define distinct theme colors for the steps and cards
const THEMES = [
  { color: "#8B5CF6", bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", ring: "ring-primary/30", icon: BarChart3, shadow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]", btn: "gradient-primary-bg text-white hover:opacity-90", btnText: "View Course →" },
  { color: "#3B82F6", bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", ring: "ring-blue-500/30", icon: Calculator, shadow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]", btn: "bg-blue-600 text-white hover:bg-blue-700", btnText: "Learn Now →" },
  { color: "#EF4444", bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", ring: "ring-destructive/30", icon: Target, shadow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]", btn: "bg-destructive text-white hover:bg-red-600", btnText: "Start Learning →" },
  { color: "#10B981", bg: "bg-success/10", text: "text-success", border: "border-success/20", ring: "ring-success/30", icon: Folder, shadow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]", btn: "bg-success text-white hover:bg-emerald-600", btnText: "View Course →" },
];

function Roadmap() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchAnalysis = useServerFn(getAnalysis);
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["analysis", id], queryFn: () => fetchAnalysis({ data: { id } }) });

  const name = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email?.split("@")[0] || "there";

  if (isLoading || !data) return <AppShell><div className="grid h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;

  const roadmap = (data.roadmap as unknown as Week[]) || [];
  const resources = (data.resources as unknown as Resource[]) || [];

  return (
    <AppShell>
      <div className="mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <button onClick={() => navigate({ to: `/results/${id}` })} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Results
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold md:text-3xl">Your Personalized Roadmap</h1>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-muted-foreground">Step-by-step plan to bridge your skill gaps and achieve your career goal.</p>
        </motion.div>
      </div>

      {/* Roadmap Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex items-center gap-2">
        <Map className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Roadmap Overview</h2>
      </motion.div>

      <div className="relative pl-24 md:pl-32 mb-16">
        {/* Vertical dotted line */}
        <div className="absolute left-[84px] md:left-[116px] top-6 bottom-6 w-[2px] border-l-2 border-dashed border-border" />

        <div className="space-y-6">
          {roadmap.map((w, i) => {
            const theme = THEMES[i % THEMES.length];
            const Icon = theme.icon;
            return (
              <motion.div key={w.week} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                className="relative flex items-center gap-6 md:gap-10">
                
                {/* Left side label (Week 1) */}
                <div className={`absolute left-[-80px] md:left-[-110px] w-16 md:w-20 text-right text-sm font-semibold ${theme.text}`}>
                  <span className={`px-3 py-1 rounded-full border bg-muted ${theme.border}`}>Week {w.week}</span>
                </div>

                {/* Circle Node */}
                <div className="absolute left-[-26px] z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-background border-4 border-background ring-1" style={{ borderColor: theme.color, boxShadow: `0 0 15px ${theme.color}40` }}>
                  <span className={`font-bold ${theme.text}`}>0{w.week}</span>
                </div>

                {/* Card */}
                <div className={`flex-1 card rounded-3xl p-6 border ${theme.border} ${theme.shadow} flex flex-col md:flex-row gap-6 justify-between`}>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{w.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{w.description || "Learn the essential skills to build your foundation and master the tools required."}</p>
                    </div>
                    
                    <div className="flex gap-10">
                      <div>
                        <div className={`text-xs font-semibold mb-2 ${theme.text}`}>Outcomes</div>
                        <ul className="space-y-1.5 text-sm text-foreground/80">
                           {w.outcomes?.length ? w.outcomes.slice(0, 3).map((o) => (
                            <li key={o} className="flex gap-2 items-start">
                              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${theme.text}`} /> {o}
                            </li>
                          )) : w.objectives?.slice(0, 3).map((o) => (
                            <li key={o} className="flex gap-2 items-start">
                              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${theme.text}`} /> {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right icon block */}
                  <div className="hidden md:flex items-center justify-center">
                    <div className={`grid h-24 w-24 place-items-center rounded-2xl ${theme.bg} border ${theme.border}`}>
                      <Icon className={`h-10 w-10 ${theme.text}`} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Resources */}
      <section className="mt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Recommended Resources</h2>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            View All Resources <ArrowRight className="h-3 w-3" />
          </button>
        </motion.div>
        
        <p className="mb-6 text-sm text-muted-foreground">Curated resources to help you learn faster and better.</p>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {resources.slice(0, 3).map((r, i) => {
            const theme = THEMES[i % THEMES.length];
            const Icon = theme.icon;
            // Fake some data to match screenshot since our DB might just have basic title/provider
            const duration = r.duration || `${4 + i} Hours`;
            const level = r.level || (i === 0 ? "Beginner" : i === 1 ? "Beginner" : "Beginner");
            const tag = r.tag || (i === 0 ? "Beginner Friendly" : i === 1 ? "Highly Rated" : "Best for You");
            
            return (
              <motion.div key={r.title + i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                className={`flex flex-col card rounded-3xl p-5 border ${theme.border} ${theme.shadow} transition-transform hover:-translate-y-1`}>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${theme.bg} border ${theme.border}`}>
                    <Icon className={`h-6 w-6 ${theme.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-foreground line-clamp-1">{r.title}</h4>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${theme.bg} ${theme.text}`}>{tag}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">Complete {r.title} for beginners with hands-on projects.</p>
                  </div>
                </div>
                
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {duration}</div>
                    <div className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {level}</div>
                  </div>
                  <a href={r.url} target="_blank" rel="noreferrer" className={`rounded-xl px-4 py-2 text-xs font-semibold transition-opacity ${theme.btn}`}>
                    {theme.btnText}
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer message */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Rocket className="h-4 w-4 text-primary" /> Stay consistent, keep learning, and you'll achieve your <span className="font-bold text-primary gradient-text">dream career!</span>
      </motion.div>
    </AppShell>
  );
}
