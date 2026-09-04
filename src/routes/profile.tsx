// src/routes/profile.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, Loader2, Mail, Pencil, Award, Brain, CheckCircle2, 
  FileCheck, Database, Play, Clock, Star, Flame, Trophy, Trash2,
  AlertCircle, ArrowRight, Eye, ShieldCheck, Check, Camera, Github, Linkedin, ExternalLink
} from "lucide-react";
import { listMyAnalyses, getAnalysis } from "@/lib/analysis.functions";
import { listQuizResults } from "@/lib/quiz.functions";
import { listLabEvaluations } from "@/lib/lab.functions";
import { listInterviewResults } from "@/lib/interview.functions";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { ProfileScene } from "@/components/three/ProfileScene";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Disha AI" }] }),
  component: () => <AuthGate><Profile /></AuthGate>,
});

// Helper for image compression to avoid user metadata size limit
function compressAndResizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 0.6 quality for small size (~15KB)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function Profile() {
  const { user } = useAuth();
  const list = useServerFn(listMyAnalyses);
  const fetchOne = useServerFn(getAnalysis);
  const listQuizzes = useServerFn(listQuizResults);
  const listLabs = useServerFn(listLabEvaluations);
  const listInterviews = useServerFn(listInterviewResults);

  // Queries
  const { data: analyses, isLoading: loadingAnalyses } = useQuery({ queryKey: ["my-analyses"], queryFn: () => list() });
  const { data: quizzes, isLoading: loadingQuizzes } = useQuery({ queryKey: ["my-quizzes"], queryFn: () => listQuizzes() });
  const { data: labs, isLoading: loadingLabs } = useQuery({ queryKey: ["my-labs"], queryFn: () => listLabs() });
  const { data: interviews, isLoading: loadingInterviews } = useQuery({ queryKey: ["my-interviews"], queryFn: () => listInterviews() });

  // Selected interview details modal state
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);

  // Profile data
  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const fullName = meta.full_name || user?.email?.split("@")[0] || "User";
  const profilePic = meta.profilePic ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
  const careerGoal = meta.career_goal ?? 'Full Stack Developer';
  const preferredRole = meta.preferred_role ?? 'Software Engineer';
  const linkedIn = meta.linkedin ?? '';
  const github = meta.github ?? '';
  const skills = meta.skills ?? [];

  // Edit details form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCareerGoal, setFormCareerGoal] = useState("");
  const [formPreferredRole, setFormPreferredRole] = useState("");
  const [formLinkedIn, setFormLinkedIn] = useState("");
  const [formGitHub, setFormGitHub] = useState("");
  const [formSkillsText, setFormSkillsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEditModal() {
    setFormName(fullName);
    setFormCareerGoal(careerGoal);
    setFormPreferredRole(preferredRole);
    setFormLinkedIn(linkedIn);
    setFormGitHub(github);
    setFormSkillsText(Array.isArray(skills) ? skills.join(", ") : "");
    setIsEditModalOpen(true);
  }

  async function handleSaveDetails() {
    setIsSaving(true);
    try {
      const parsedSkills = formSkillsText
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      // 1. Update auth.users metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: formName,
          career_goal: formCareerGoal,
          preferred_role: formPreferredRole,
          linkedin: formLinkedIn,
          github: formGitHub,
          skills: parsedSkills
        }
      });

      if (authError) throw authError;

      if (!user?.id) throw new Error("User session not found");

      // 2. Sync with public.profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: formName })
        .eq("id", user.id);

      if (profileError) {
        console.warn("Could not sync to profiles table:", profileError);
      }

      await supabase.auth.refreshSession();
      toast.success("Profile details updated successfully!");
      setIsEditModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile details");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setIsUploading(true);
    try {
      const compressedBase64 = await compressAndResizeImage(file);
      
      const { error: authError } = await supabase.auth.updateUser({
        data: { profilePic: compressedBase64 }
      });

      if (authError) throw authError;

      await supabase.auth.refreshSession();
      toast.success("Profile picture updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  }

  // Stats calculation
  const latestResumeScore = analyses && analyses.length > 0 ? analyses[0].readiness_score : 0;
  const latestAtsScore = analyses && analyses.length > 0 ? Math.max(45, Math.min(95, Math.round(analyses[0].readiness_score * 0.9 + 10))) : 0;
  const avgQuizScore = quizzes && quizzes.length > 0 ? Math.round(quizzes.reduce((acc, q) => acc + ((q as any)?.score ?? 0), 0) / quizzes.length) : 0;
  const avgLabScore = labs && labs.length > 0 ? Math.round(labs.reduce((acc, l) => acc + ((l as any)?.score ?? 0), 0) / labs.length) : 0;

  // Badges lists
  const badges = [
    { name: "Resume Master", desc: "Readiness score >= 80%", earned: latestResumeScore >= 80, icon: Award, color: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
    { name: "ATS Expert", desc: "ATS compatibility >= 80%", earned: latestAtsScore >= 80, icon: ShieldCheck, color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10" },
    { name: "Code Wizard", desc: "Avg Lab score >= 75%", earned: avgLabScore >= 75, icon: Database, color: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
    { name: "Perfect Quizzer", desc: "Avg Quiz score >= 85%", earned: avgQuizScore >= 85, icon: Brain, color: "text-pink-400 border-pink-400/30 bg-pink-400/10" },
    { name: "Consistent Learner", desc: "Completed 3 activities", earned: ((analyses?.length || 0) + (quizzes?.length || 0) + (labs?.length || 0)) >= 3, icon: Trophy, color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  ];

  // Learning journey steps
  const journeySteps = [
    { title: "Resume Analysis", desc: "Evaluate credentials and format parsed ATS scores.", completed: (analyses?.length || 0) > 0 },
    { title: "Skill Gap Detection", desc: "Identify technology deficits against target role requirements.", completed: (analyses?.length || 0) > 0 },
    { title: "Quiz Practice", desc: "Challenge notes comprehension with adaptive AI quizzes.", completed: (quizzes?.length || 0) > 0 },
    { title: "Lab Evaluation", desc: "Submit practical code assignments for automatic AST validation.", completed: (labs?.length || 0) > 0 },
    { title: "Career Growth", desc: "Scale up to target roles and build comprehensive PDF reports.", completed: (analyses?.length || 0) > 0 && (quizzes?.length || 0) > 0 && (labs?.length || 0) > 0 },
  ];

  const chart = (analyses ?? []).slice().reverse().map((a) => ({
    name: new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: a.readiness_score,
  }));

  async function downloadPdf(id: string, role: string) {
    try {
      const a = await fetchOne({ data: { id } });
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      let y = 50;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Disha AI — Performance Evaluation", 40, y);
      y += 28;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Candidate: ${fullName}`, 40, y); y += 16;
      doc.text(`Email: ${user?.email ?? ""}`, 40, y); y += 16;
      doc.text(`Target role: ${role}`, 40, y); y += 16;
      doc.text(`Readiness score: ${a.readiness_score} / 100`, 40, y); y += 24;

      if (a.summary) {
        doc.setFont("helvetica", "bold");
        doc.text("Summary", 40, y); y += 16;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(a.summary as string, 510);
        doc.text(lines, 40, y);
        y += lines.length * 14 + 10;
      }

      const section = (title: string, items: string[]) => {
        if (y > 740) { doc.addPage(); y = 50; }
        doc.setFont("helvetica", "bold");
        doc.text(title, 40, y); y += 16;
        doc.setFont("helvetica", "normal");
        items.forEach(it => {
          if (y > 770) { doc.addPage(); y = 50; }
          const lines = doc.splitTextToSize("• " + it, 510);
          doc.text(lines, 40, y);
          y += lines.length * 14;
        });
        y += 10;
      };

      section("Skills Found", (a.extracted_skills as string[]) || []);
      section("Missing Skills", (a.missing_skills as string[]) || []);

      doc.setFont("helvetica", "bold");
      if (y > 720) { doc.addPage(); y = 50; }
      doc.text("Personalized Roadmap", 40, y); y += 16;
      doc.setFont("helvetica", "normal");
      ((a.roadmap as { week: number; title: string; objectives?: string[] }[]) || []).forEach(w => {
        if (y > 760) { doc.addPage(); y = 50; }
        doc.setFont("helvetica", "bold");
        doc.text(`Week ${w.week}: ${w.title}`, 40, y); y += 14;
        doc.setFont("helvetica", "normal");
        (w.objectives || []).forEach(o => {
          if (y > 780) { doc.addPage(); y = 50; }
          const lines = doc.splitTextToSize("• " + o, 500);
          doc.text(lines, 50, y); y += lines.length * 13;
        });
        y += 6;
      });

      doc.save(`DishaAI-Report-${role.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    }
  }

  return (
    <AppShell>
      {/* 3D scene background */}
      <ProfileScene />

      <div className="space-y-8 max-w-5xl mx-auto py-6">
        
        {/* Header Title */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="border-b border-white/5 pb-4">
          <h1 className="text-3xl font-bold md:text-4xl">Your Profile & Growth</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor credentials, quiz analytics, and achievement badges.</p>
        </motion.div>

        {/* Unified Edit Modal */}
        <AnimatePresence>
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card text-foreground border border-border p-6 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-primary" /> Edit Profile Details
                  </h2>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      value={formName} 
                      onChange={e => setFormName(e.target.value)} 
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none text-foreground focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1.5">Career Goal</label>
                      <input 
                        type="text" 
                        value={formCareerGoal} 
                        onChange={e => setFormCareerGoal(e.target.value)} 
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none text-foreground focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1.5">Preferred Role</label>
                      <input 
                        type="text" 
                        value={formPreferredRole} 
                        onChange={e => setFormPreferredRole(e.target.value)} 
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none text-foreground focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1.5 font-sans">LinkedIn Profile URL</label>
                      <input 
                        type="url" 
                        value={formLinkedIn} 
                        onChange={e => setFormLinkedIn(e.target.value)} 
                        placeholder="https://linkedin.com/in/username"
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none text-foreground focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1.5">GitHub Profile URL</label>
                      <input 
                        type="url" 
                        value={formGitHub} 
                        onChange={e => setFormGitHub(e.target.value)} 
                        placeholder="https://github.com/username"
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none text-foreground focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">Skills (Comma-separated)</label>
                    <textarea 
                      value={formSkillsText} 
                      onChange={e => setFormSkillsText(e.target.value)} 
                      placeholder="React, Node.js, Python, AWS"
                      rows={3}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs outline-none text-foreground resize-none transition-colors"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Separate skills with commas. Empty entries are ignored.</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <button 
                    onClick={() => setIsEditModalOpen(false)} 
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveDetails} 
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Hidden File Input for Avatar Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Top Grid: Personal Details & Performance Metrics */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Card 1: Personal Details */}
          <div className="card rounded-3xl p-6 md:col-span-1 flex flex-col justify-between relative overflow-hidden group shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
            
            {/* Glowing ambient background inside the card */}
            <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-primary/10 blur-[50px] pointer-events-none group-hover:bg-primary/15 transition-all duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Candidate Details</h3>
                <button 
                  onClick={openEditModal}
                  className="p-1.5 rounded-lg bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border hover:border-primary/30 transition-all"
                  title="Edit Profile details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {/* Profile Pic - Enlarged (w-32 h-32) and Beautifully Centered */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative w-32 h-32 rounded-full mb-4 group/avatar shadow-[0_0_25px_rgba(139,92,246,0.15)] ring-4 ring-primary/20 hover:ring-primary/50 transition-all duration-300">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img 
                      src={profilePic} 
                      alt="Profile" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-105" 
                    />
                  </div>
                  
                  {/* Floating Action Trigger for Image Change */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-1 right-1 bg-background hover:bg-primary border border-border text-foreground hover:text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center"
                    title="Change Profile Photo"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-foreground hover:text-white" />
                    ) : (
                      <Camera className="w-4 h-4 text-foreground group-hover:text-white" />
                    )}
                  </button>
                </div>
                
                <div className="max-w-full px-2">
                  <h2 className="text-xl font-bold text-foreground tracking-tight leading-tight">{fullName}</h2>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                </div>
              </div>

              {/* Profile Details List */}
              <div className="space-y-4 pt-5 border-t border-border">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Career Goal</span>
                  <span className="text-xs font-semibold text-foreground/90">{careerGoal}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Preferred Role</span>
                  <span className="text-xs font-semibold text-foreground/90">{preferredRole}</span>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-2 pt-2">
                  {linkedIn ? (
                    <a 
                      href={linkedIn.startsWith("http") ? linkedIn : `https://${linkedIn}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border border-[#0A66C2]/20 rounded-xl text-[10px] font-bold text-[#0A66C2] transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 bg-muted border border-border rounded-xl text-[10px] text-muted-foreground font-semibold">No LinkedIn</span>
                  )}

                  {github ? (
                    <a 
                      href={github.startsWith("http") ? github : `https://${github}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-[10px] font-bold text-foreground transition-colors"
                    >
                      <Github className="h-3.5 w-3.5" /> GitHub
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 bg-muted border border-border rounded-xl text-[10px] text-muted-foreground font-semibold">No GitHub</span>
                  )}
                </div>

                {/* Skills Section */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-2">My Skills</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {Array.isArray(skills) && skills.length > 0 ? (
                      skills.map((s: string) => (
                        <span key={s} className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold transition-all hover:bg-primary/15">{s}</span>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No custom skills loaded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-muted-foreground mt-6 pt-3 border-t border-border text-center">
              Configure details or change your profile photo to personalize Disha AI.
            </div>
          </div>

          {/* Card 2: Performance Statistics */}
          <div className="card rounded-3xl p-6 md:col-span-2 space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-4">Growth Statistics</h3>
              
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                
                {/* Stat 1: Resume Score */}
                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-center hover:border-primary/30 transition-colors">
                  <Award className="h-5 w-5 text-primary mx-auto mb-2" />
                  <div className="text-xl font-extrabold text-foreground">{latestResumeScore}%</div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold mt-1">Resume Fit</div>
                </div>

                {/* Stat 2: ATS Score */}
                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-center hover:border-cyan-400/30 transition-colors">
                  <FileCheck className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
                  <div className="text-xl font-extrabold text-foreground">{latestAtsScore}%</div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold mt-1">ATS Match</div>
                </div>

                {/* Stat 3: Quiz Score */}
                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-center hover:border-pink-400/30 transition-colors">
                  <Brain className="h-5 w-5 text-pink-400 mx-auto mb-2" />
                  <div className="text-xl font-extrabold text-foreground">{avgQuizScore}%</div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold mt-1">Avg Quiz</div>
                </div>

                {/* Stat 4: Lab Score */}
                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-center hover:border-purple-400/30 transition-colors">
                  <Database className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                  <div className="text-xl font-extrabold text-foreground">{avgLabScore}%</div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold mt-1">Avg Lab</div>
                </div>

              </div>
            </div>

            {/* Progress chart */}
            <div className="mt-4">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-3">Resume Score Progression</div>
              <div className="h-[140px] w-full">
                {chart.length === 0 ? (
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">
                    Perform a resume analysis to visualize score growth.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 4, fill: "#8B5CF6" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Middle Row: Achievements Section & Learning Journey Timeline */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Achievements & Badges */}
          <div className="card rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Achievements & Badges</h3>
            
            <div className="space-y-3">
              {badges.map((b) => {
                const Icon = b.icon;
                return (
                  <div 
                    key={b.name} 
                    className={`flex items-center justify-between border rounded-2xl p-3.5 transition-all ${b.earned ? b.color : "opacity-35 border-border bg-muted/20"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-muted/60">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{b.name}</h4>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">{b.desc}</span>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold">
                      {b.earned ? (
                        <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Earned</span>
                      ) : (
                        <span className="text-muted-foreground/60">Locked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Learning Journey Timeline */}
          <div className="card rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Learning Journey</h3>
            
            <div className="relative pl-6 py-1">
              <div className="absolute left-[9px] top-4 bottom-4 w-[1px] border-l border-dashed border-border" />
              
              <div className="space-y-4">
                {journeySteps.map((step, idx) => (
                  <div key={idx} className="relative flex gap-3.5">
                    
                    {/* Circle Dot indicator */}
                    <div className={`absolute left-[-22px] top-0.5 h-3 w-3 rounded-full border ${step.completed ? "bg-success border-success" : "bg-background border-border"}`} />

                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold ${step.completed ? "text-foreground" : "text-muted-foreground/50"}`}>{step.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Historical Records Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Historical Records of Resume Evaluations */}
          <div className="card rounded-3xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Historical Resume Evaluations</h3>
            {loadingAnalyses ? (
              <div className="flex py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (analyses ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No evaluations found. <Link to="/dashboard" className="text-primary hover:underline">Run your first analysis →</Link>
              </p>
            ) : (
              <div className="divide-y divide-border">
                {(analyses ?? []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-4 py-3 text-xs">
                    <div>
                      <div className="font-bold text-foreground">{a.target_role}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-primary">{a.readiness_score}</div>
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground">/ 100</div>
                      </div>
                      
                      <Link 
                        to="/dashboard" 
                        search={{ id: a.id }} 
                        className="rounded-full border border-border bg-muted px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View
                      </Link>

                      <button 
                        onClick={() => downloadPdf(a.id, a.target_role)} 
                        className="inline-flex items-center gap-1 rounded-full bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-[10px] font-bold hover:bg-primary/30 transition-colors animate-none"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Records of AI Mock Interviews */}
          <div className="card rounded-3xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Historical Mock Interviews</h3>
            {loadingInterviews ? (
              <div className="flex py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (interviews ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No mock interviews found. <Link to="/interview" className="text-primary hover:underline">Start your first interview →</Link>
              </p>
            ) : (
              <div className="divide-y divide-border">
                {(interviews ?? []).map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between gap-4 py-3 text-xs">
                    <div>
                      <div className="font-bold text-foreground">{i.target_role}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(i.created_at).toLocaleString()}</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-primary">{i.score}</div>
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground">/ 10</div>
                      </div>
                      
                      <button 
                        onClick={() => setSelectedInterview(i)}
                        className="rounded-full border border-border bg-muted px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interview Details Modal */}
        <AnimatePresence>
          {selectedInterview && (
            <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card text-foreground border border-border p-6 rounded-3xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" /> Interview Evaluation Report
                    </h2>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Role: {selectedInterview.target_role} · Score: {selectedInterview.score}/10 · Date: {new Date(selectedInterview.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedInterview(null)}
                    className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
                  {Array.isArray(selectedInterview.questions_answers) && selectedInterview.questions_answers.map((item: any, idx: number) => (
                    <div key={idx} className="border border-border/60 bg-muted/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-[10px] font-bold text-primary uppercase">Question {idx + 1} ({item.category})</span>
                        <span className="text-xs font-bold text-primary">Score: {item.score}/10</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Question</span>
                        <p className="text-xs text-foreground font-semibold">{item.question}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3 border border-border/30">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Your Response</span>
                        <p className="text-xs text-foreground italic">"{item.answer}"</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-[10px]">
                          <span className="font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Strengths</span>
                          <ul className="list-disc pl-3.5 space-y-1 text-muted-foreground">
                            {Array.isArray(item.strengths) && item.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-[10px]">
                          <span className="font-bold text-amber-400 block mb-1 uppercase tracking-wider">Suggestions</span>
                          <ul className="list-disc pl-3.5 space-y-1 text-muted-foreground">
                            {Array.isArray(item.improvements) && item.improvements.map((imp: string, i: number) => <li key={i}>{imp}</li>)}
                          </ul>
                        </div>
                      </div>
                      {item.sampleAnswer && (
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-[10px]">
                          <span className="font-bold text-primary block mb-1 uppercase tracking-wider">Ideal Model Response</span>
                          <p className="text-muted-foreground leading-relaxed">{item.sampleAnswer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-border">
                  <button 
                    onClick={() => setSelectedInterview(null)} 
                    className="px-5 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer"
                  >
                    Close Report
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}

// Simple custom inline SVG component for close button since Lucide-react might not export X directly under some aliases
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

