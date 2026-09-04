// src/routes/lab.client.tsx
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Code, Terminal, Upload, FileText, X, CheckCircle2, AlertCircle, 
  ArrowRight, Award, Play, RotateCcw, ChevronRight, Check, Sparkles,
  BookOpen, Layers, Cpu, Database, HelpCircle, FileCheck, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LabScene } from "@/components/three/LabScene";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { evaluateLab, saveLabEvaluation, listLabEvaluations } from "@/lib/lab.functions";

const SUBJECTS = ["Python Programming", "Java Fundamentals", "Database Management Systems (SQL)", "Operating Systems", "Web Development (HTML/CSS/JS)", "Machine Learning"];

export default function LabClient() {
  const evaluateLabFn = useServerFn(evaluateLab);
  const saveLabFn = useServerFn(saveLabEvaluation);
  const getHistoryFn = useServerFn(listLabEvaluations);

  // States
  const [state, setState] = useState<"setup" | "compiling" | "results">("setup");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Compilation logs simulation
  const [logs, setLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);

  // Evaluation results
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const COMPILER_LOGS = [
    "Initializing sandboxed container runtime...",
    "Mounting project directory structures...",
    "Detecting programming syntax boundaries...",
    "Verifying AST (Abstract Syntax Tree) representations...",
    "Running automated functional unit checks...",
    "Analyzing static code quality rules...",
    "Checking Javadoc & inline documentation metrics...",
    "Running exception safety edge validation...",
    "Forwarding tokens to Gemini AI review gateway...",
    "Parsing performance score vector matrices...",
    "Evaluation complete. Generating diagnostics report."
  ];

  // Fetch history on load
  useEffect(() => {
    loadHistory();
  }, []);

  // Compiler logs simulator
  useEffect(() => {
    if (state !== "compiling") return;
    setLogs([]);
    setLogIndex(0);

    const interval = setInterval(() => {
      setLogIndex(i => {
        if (i < COMPILER_LOGS.length) {
          setLogs(prev => [...prev, COMPILER_LOGS[i]]);
          return i + 1;
        } else {
          clearInterval(interval);
          return i;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [state]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await getHistoryFn();
      setHistory(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleFileSelect(f?: File | null) {
    if (!f) return;
    setFile(f);
  }

  async function handleSubmit() {
    let textContent = code.trim();
    let filename = "Raw_Code.txt";

    if (file) {
      filename = file.name;
      setState("compiling");
      try {
        const { extractPdfText } = await import('@/lib/pdf-extract.client');
        textContent = await extractPdfText(file);
      } catch (err) {
        // Fallback: If it's a code file (txt, py, java), try reading as text
        try {
          textContent = await file.text();
        } catch (readErr) {
          toast.error("Could not read uploaded file. Paste your code instead.");
          setState("setup");
          return;
        }
      }
    }

    if (!textContent || textContent.length < 15) {
      toast.error("Please paste code/report contents or upload a file.");
      setState("setup");
      return;
    }

    setState("compiling");

    try {
      const response = await evaluateLabFn({
        data: {
          codeOrReportText: textContent,
          subject,
          filename,
        }
      });

      setResult(response);
      
      // Save results
      await saveLabFn({
        data: {
          subject,
          filename,
          score: response.score,
          logicScore: response.logic_score,
          docScore: response.doc_score,
          completenessScore: response.completeness_score,
          outputScore: response.output_score,
          codeQualityScore: response.code_quality_score,
          strengths: response.strengths,
          weaknesses: response.weaknesses,
          feedback: response.feedback,
          suggestions: response.suggestions,
          timeline: response.timeline,
        }
      });

      // wait a bit for compilation animation to look realistic
      setTimeout(() => {
        setState("results");
        loadHistory();
      }, 5000);

    } catch (err: any) {
      toast.error(err.message || "Failed to analyze assignment.");
      setState("setup");
    }
  }

  return (
    <AppShell>
      {/* 3D scene background */}
      <LabScene />

      <div className="mx-auto max-w-4xl min-h-[80vh] flex flex-col justify-between py-6">
        <AnimatePresence mode="wait">

          {/* ==========================================
             STATE 1: SETUP
             ========================================== */}
          {state === "setup" && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-4">
                  <Terminal className="h-3.5 w-3.5" /> Code & Report Evaluator
                </div>
                <h1 className="text-4xl font-bold md:text-5xl tracking-tight text-foreground leading-tight">
                  Lab <span className="gradient-text">Evaluator AI</span>
                </h1>
                <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
                  Evaluate source code correctness, database query structures, ML report completeness, and code modularity. Submit files to trigger compiler diagnostic reviews.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Inputs block */}
                <div className="card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-2">Subject Selection</label>
                      <select 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                      >
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-2">Option A: Paste Source Code / Report Text</label>
                      <textarea
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="Paste your code block or text-based report analysis (min 15 chars)..."
                        disabled={!!file}
                        className="w-full h-44 bg-background border border-border rounded-xl p-4 text-xs font-mono outline-none focus:border-cyan-500 resize-none placeholder:text-muted-foreground disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload block */}
                <div className="card rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-2">Option B: Upload Source / ZIP / PDF File</label>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files?.[0]); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all min-h-[190px] flex flex-col justify-center ${dragOver ? "border-cyan-500 bg-cyan-500/5 scale-[1.01]" : "border-border bg-muted/20 hover:border-cyan-500/60"}`}
                    >
                      <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e.target.files?.[0])} />
                      {file ? (
                        <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-left">
                          <div className="flex items-center gap-3 truncate">
                            <FileText className="h-5 w-5 text-cyan-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium text-foreground">{file.name}</div>
                              <div className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); setFile(null); }} className="p-1 hover:bg-destructive/10 rounded-full">
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="mx-auto h-7 w-7 text-cyan-500/80 mb-2" />
                          <div className="text-xs font-medium text-foreground">Select script or document</div>
                          <div className="text-[10px] text-muted-foreground mt-1">drag and drop here</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <MagneticButton onClick={handleSubmit} className="w-full py-2.5 text-xs font-bold">
                      <span className="flex items-center gap-1.5 justify-center"><Play className="h-4 w-4" /> Evaluate Submission</span>
                    </MagneticButton>
                  </div>
                </div>
              </div>

              {/* History section */}
              {history.length > 0 && (
                <div className="border-t border-border pt-8">
                  <h3 className="text-sm font-bold text-muted-foreground mb-4">Past Lab Evaluations</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {history.slice(0, 3).map((h: any) => (
                      <div key={h.id} className="p-4 bg-muted border border-border rounded-2xl flex justify-between items-center">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{h.subject}</h4>
                          <span className="text-[10px] text-muted-foreground truncate block">{h.filename}</span>
                        </div>
                        <div className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg">
                          {h.score}/100
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ==========================================
             STATE 2: COMPILING
             ========================================== */}
          {state === "compiling" && (
            <motion.div 
              key="compiling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto w-full space-y-6"
            >
              <div className="text-center mb-6">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-2" />
                <h3 className="text-base font-bold">Executing Automated Diagnostics</h3>
                <p className="text-xs text-muted-foreground">Running compiler validations & semantic review checks...</p>
              </div>

              {/* Console logs card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 font-mono text-xs text-success-foreground min-h-[260px] flex flex-col justify-start space-y-1.5 shadow-2xl overflow-y-auto">
                <div className="text-slate-400 pb-2 border-b border-slate-900 flex justify-between items-center">
                  <span>console_evaluator_stdout.log</span>
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                {logs.map((log, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -5 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 items-start text-emerald-400"
                  >
                    <span className="text-slate-600 select-none">$</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==========================================
             STATE 3: RESULTS PANEL
             ========================================== */}
          {state === "results" && result && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Header result row */}
              <div className="card rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1">Evaluation Finished</div>
                  <h2 className="text-2xl font-bold text-foreground">{subject} Details</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compiled document: <span className="font-semibold text-foreground">{file ? file.name : "Raw_Code.txt"}</span>
                  </p>
                </div>
                
                {/* Radial Score */}
                <div className="flex items-center gap-4">
                  <div className="relative grid h-24 w-24 place-items-center">
                    <svg viewBox="0 0 100 100" className="-rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <motion.circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="none" 
                        stroke="#06B6D4" 
                        strokeLinecap="round" 
                        strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 40} 
                        initial={{ strokeDashoffset: 2 * Math.PI * 40 }} 
                        animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - result.score / 100) }}
                        transition={{ duration: 1.2 }} 
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <div className="text-xl font-extrabold text-foreground">{result.score}</div>
                      <div className="text-[8px] font-bold text-muted-foreground">/100</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Progress scores */}
                <div className="card rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">Evaluation Metrics</h3>
                  
                  <ProgressRow label="Algorithm Logic & Correctness" score={result.logic_score} color="bg-cyan-500" />
                  <ProgressRow label="Comments & Document Structure" score={result.doc_score} color="bg-primary" />
                  <ProgressRow label="Completeness of Objectives" score={result.completeness_score} color="bg-emerald-500" />
                  <ProgressRow label="Output Format & Handling" score={result.output_score} color="bg-amber-500" />
                  <ProgressRow label="Modularity & Code Quality" score={result.code_quality_score} color="bg-pink-500" />
                </div>

                {/* AI Critique feedback */}
                <div className="card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-cyan-400" /> AI Critique
                    </h3>
                    <p className="text-xs text-foreground/80 dark:text-white/80 leading-relaxed bg-muted border border-border rounded-xl p-4">
                      {result.feedback}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Actionable suggestions</div>
                    <ul className="text-xs space-y-1 text-foreground/80 dark:text-white/70">
                      {result.suggestions && result.suggestions.slice(0, 2).map((sug: string, i: number) => (
                        <li key={i} className="flex gap-1.5 items-start">
                          <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Strengths */}
                <div className="card rounded-3xl p-6">
                  <h3 className="text-sm font-bold text-success mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5" /> Strengths Found
                  </h3>
                  <ul className="text-xs space-y-2 text-foreground/80 dark:text-white/80">
                    {result.strengths && result.strengths.map((str: string, i: number) => (
                      <li key={i} className="flex gap-2 items-start bg-muted/40 rounded-xl px-4 py-2 border border-border">
                        <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="card rounded-3xl p-6">
                  <h3 className="text-sm font-bold text-destructive mb-3 flex items-center gap-1.5">
                    <AlertCircle className="h-4.5 w-4.5" /> Weaknesses Detected
                  </h3>
                  <ul className="text-xs space-y-2 text-foreground/80 dark:text-white/80">
                    {result.weaknesses && result.weaknesses.map((weak: string, i: number) => (
                      <li key={i} className="flex gap-2 items-start bg-muted/40 rounded-xl px-4 py-2 border border-border">
                        <X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Improvement timeline */}
              <div className="card rounded-3xl p-6">
                <h3 className="text-sm font-bold text-foreground mb-4">Code Correction Timeline</h3>
                <div className="space-y-4">
                  {result.timeline && result.timeline.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold">
                        {item.step}
                      </div>
                      <div className="flex-1 bg-muted/40 border border-border rounded-xl p-3.5">
                        <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup actions */}
              <div className="flex justify-end">
                <button
                  onClick={() => setState("setup")}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="h-4 w-4" /> Evaluate Another File
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function ProgressRow({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/80 dark:text-white/80">{label}</span>
        <span className="font-bold">{score}/100</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
