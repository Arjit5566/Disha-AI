// src/routes/quiz.client.tsx
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Brain, Upload, FileText, X, Check, Loader2, ArrowRight, 
  HelpCircle, Clock, AlertTriangle, RefreshCw, BarChart2, Lightbulb, 
  BookOpen, Star, HelpCircle as HelpIcon, Award, Play
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuizScene } from "@/components/three/QuizScene";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { generateQuiz, saveQuizResult, listQuizResults } from "@/lib/quiz.functions";

const SUBJECTS = ["Data Structures & Algorithms", "Database Management Systems", "Operating Systems", "Computer Networks", "Web Development", "Machine Learning", "System Design"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Adaptive AI"];


async function isPdfFile(file: File): Promise<boolean> {
  try {
    const arr = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46; // %PDF
  } catch (e) {
    return false;
  }
}

export default function QuizClient() {
  const genQuizFn = useServerFn(generateQuiz);
  const saveQuizFn = useServerFn(saveQuizResult);
  const getHistoryFn = useServerFn(listQuizResults);

  // States
  const [state, setState] = useState<"setup" | "loading" | "active" | "results">("setup");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [difficulty, setDifficulty] = useState("Medium");
  const qType = "mcq";
  
  // Quiz running states
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timer, setTimer] = useState(30);
  const [quizScore, setQuizScore] = useState(0);
  
  // Results analytics
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch quiz history on load
  useEffect(() => {
    loadHistory();
  }, []);

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

  // Question Timer
  useEffect(() => {
    if (state !== "active") return;
    if (timer <= 0) {
      // Time is out, treat as incorrect
      handleNextQuestion("TIMEOUT");
      return;
    }
    const t = setInterval(() => setTimer(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [timer, state]);

  async function handleFileSelect(f?: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file.");
      return;
    }
    const isValid = await isPdfFile(f);
    if (!isValid) {
      toast.error("Invalid PDF file structure. Please upload a valid PDF document.");
      return;
    }
    setFile(f);
  }

  async function handleStartQuiz() {
    let sourceText = notes.trim();
    if (file) {
      setState("loading");
      try {
        const { extractPdfText } = await import('@/lib/pdf-extract.client');
        sourceText = await extractPdfText(file);
      } catch (err) {
        toast.error("Failed to extract text from PDF. Ensure it is a valid text‑based PDF and not a scanned image.");
        setState("setup");
        return;
      }
    }

    if (!sourceText || sourceText.length < 15) {
      toast.error("Please paste your study notes or upload a PDF first.");
      setState("setup");
      return;
    }

    setState("loading");
    try {
      const quizResult = await genQuizFn({
        data: {
          notesText: sourceText,
          difficulty,
          questionType: qType,
          subject,
        }
      });

      if (!quizResult.questions || quizResult.questions.length === 0) {
        throw new Error("No questions generated.");
      }

      setQuestions(quizResult.questions);
      setWeakTopics(quizResult.weak_topics || []);
      setSuggestions(quizResult.suggestions || []);
      setCurrentIndex(0);
      setUserAnswers({});
      setSelectedOption(null);
      setHasAnswered(false);
      setTimer(30);
      setState("active");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz. Try again.");
      setState("setup");
    }
  }

  function handleAnswerSelect(opt: string) {
    if (hasAnswered) return;
    setSelectedOption(opt);
    setHasAnswered(true);
    setUserAnswers(prev => ({ ...prev, [currentIndex]: opt }));
  }

  function handleNextQuestion(timeoutAnswer?: string) {
    const isTimeout = timeoutAnswer === "TIMEOUT";
    const currentQ = questions[currentIndex];
    const answer = isTimeout ? "" : selectedOption || "";
    
    // Evaluate correctness
    const isCorrect = answer.toLowerCase().trim() === currentQ.answer.toLowerCase().trim();

    let nextIndex = currentIndex + 1;
    if (nextIndex < questions.length) {
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setSelectedOption(null);
        setHasAnswered(false);
        setTimer(30);
      }, isTimeout ? 0 : 1800); // delay so user can read explanation
    } else {
      // Calculate final score
      setTimeout(async () => {
        let finalCorrect = 0;
        const finalAnswers = { ...userAnswers };
        if (isTimeout) finalAnswers[currentIndex] = "";

        questions.forEach((q, idx) => {
          const ans = finalAnswers[idx] || "";
          if (ans.toLowerCase().trim() === q.answer.toLowerCase().trim()) {
            finalCorrect++;
          }
        });

        const scorePct = Math.round((finalCorrect / questions.length) * 100);
        setQuizScore(scorePct);
        setState("results");

        // Save to DB
        try {
          await saveQuizFn({
            data: {
              subject,
              difficulty,
              questions,
              score: scorePct,
              totalQuestions: questions.length,
              weakTopics,
              suggestions,
            }
          });
          loadHistory();
        } catch (err) {
          console.error("Could not persist quiz history", err);
        }
      }, isTimeout ? 0 : 1800);
    }
  }

  // Statistics Chart
  const chartData = [
    { name: "Correct", value: quizScore, fill: "#10B981" },
    { name: "Incorrect", value: 100 - quizScore, fill: "#EF4444" }
  ];

  return (
    <AppShell>
      {/* 3D background scene */}
      <QuizScene />

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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4">
                  <Brain className="h-3.5 w-3.5" /> Note-to-Quiz Engine
                </div>
                <h1 className="text-4xl font-bold md:text-5xl tracking-tight text-foreground leading-tight">
                  Intelligent <span className="gradient-text">Quiz AI</span>
                </h1>
                <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
                  Paste code, study notes, or upload PDF slides. Our AI agent compiles difficulty-adjusted questions to test your engineering retention.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Inputs area */}
                <div className="card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-2">Subject Category</label>
                      <select 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                      >
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-2">Difficulty</label>
                      <select 
                        value={difficulty} 
                        onChange={e => setDifficulty(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                      >
                        {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-2">Option A: Paste Study Text</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Paste summaries, lecture nodes or code blocks here (min 15 chars)..."
                        disabled={!!file}
                        className="w-full h-36 bg-background border border-border rounded-xl p-4 text-xs outline-none focus:border-primary resize-none placeholder:text-muted-foreground disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload / Drag card */}
                <div className="card rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-2">Option B: Upload Slides / PDF Notes</label>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files?.[0]); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all min-h-[170px] flex flex-col justify-center ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-muted/20 hover:border-primary/60"}`}
                    >
                      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFileSelect(e.target.files?.[0])} />
                      {file ? (
                        <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-left">
                          <div className="flex items-center gap-3 truncate">
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium text-foreground">{file.name}</div>
                              <div className="text-[10px] text-muted-foreground">PDF Document</div>
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); setFile(null); }} className="p-1 hover:bg-destructive/10 rounded-full">
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="mx-auto h-7 w-7 text-primary/80 mb-2" />
                          <div className="text-xs font-medium text-foreground">Select PDF slides file</div>
                          <div className="text-[10px] text-muted-foreground mt-1">drag and drop here</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <MagneticButton onClick={handleStartQuiz} className="w-full py-2.5 text-xs font-bold">
                      <span className="flex items-center gap-1.5 justify-center"><Sparkles className="h-4 w-4" /> Generate Quiz Now</span>
                    </MagneticButton>
                  </div>
                </div>
              </div>

              {/* History section */}
              {history.length > 0 && (
                <div className="border-t border-border pt-8">
                  <h3 className="text-sm font-bold text-muted-foreground mb-4">Past Quiz Performances</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {history.slice(0, 3).map((h: any) => (
                      <div key={h.id} className="p-4 bg-muted border border-border rounded-2xl flex justify-between items-center">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{h.subject}</h4>
                          <span className="text-[10px] text-muted-foreground">{h.difficulty} Mode</span>
                        </div>
                        <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                          {h.score}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ==========================================
             STATE 2: LOADING ORB
             ========================================== */}
          {state === "loading" && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-[50vh] text-center"
            >
              <div className="relative h-28 w-28 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <Brain className="h-10 w-10 text-primary absolute inset-0 m-auto animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Compiling Quiz Questions</h2>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                Gemini AI is examining your documentation nodes to formulate retainable test cases...
              </p>
            </motion.div>
          )}

          {/* ==========================================
             STATE 3: ACTIVE GAME BOARD
             ========================================== */}
          {state === "active" && questions.length > 0 && (
            <motion.div 
              key="active"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-2xl mx-auto w-full space-y-6"
            >
              {/* Top info and progress bar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold">Question {currentIndex + 1} of {questions.length}</span>
                <span className="flex items-center gap-1.5 font-semibold text-warning bg-warning/10 px-2.5 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5" /> {timer}s left
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Card */}
              <div className="card rounded-3xl p-6 space-y-6">
                <h3 className="text-base font-bold text-foreground leading-relaxed">
                  {questions[currentIndex].question}
                </h3>

                {/* Option list */}
                <div className="space-y-3">
                  {questions[currentIndex].options && questions[currentIndex].options.map((opt: string, i: number) => {
                    const isSelected = selectedOption === opt;
                    const isCorrect = opt === questions[currentIndex].answer;
                    
                    let bgStyle = "bg-muted/40 border-border hover:border-primary/40 hover:bg-muted/80";
                    if (hasAnswered) {
                      if (isCorrect) bgStyle = "bg-success/15 border-success/40 text-success font-bold";
                      else if (isSelected) bgStyle = "bg-destructive/15 border-destructive/40 text-destructive";
                      else bgStyle = "bg-muted/20 border-border opacity-55 text-muted-foreground";
                    }

                    return (
                      <button
                        key={i}
                        disabled={hasAnswered}
                        onClick={() => handleAnswerSelect(opt)}
                        className={`w-full text-left px-5 py-3.5 rounded-xl border text-xs font-semibold transition-all flex justify-between items-center ${bgStyle}`}
                      >
                        {opt}
                        {hasAnswered && isCorrect && <Check className="h-4 w-4 text-success" />}
                        {hasAnswered && isSelected && !isCorrect && <X className="h-4 w-4 text-destructive" />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Reveal */}
                <AnimatePresence>
                  {hasAnswered && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-[11px] text-foreground/80 dark:text-white/80 leading-relaxed"
                    >
                      <div className="flex gap-1.5 items-center font-bold text-primary mb-1">
                        <Lightbulb className="h-4 w-4" /> AI Explanation
                      </div>
                      {questions[currentIndex].explanation}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                {hasAnswered && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleNextQuestion()}
                      className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      Next Question <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==========================================
             STATE 4: RESULTS DASHBOARD
             ========================================== */}
          {state === "results" && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Header card */}
              <div className="card rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Evaluation Completed</div>
                  <h2 className="text-2xl font-bold text-foreground">Score Summary: {subject}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Difficulty level: <span className="font-semibold text-foreground">{difficulty}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-primary">{quizScore}%</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Accuracy</div>
                  </div>
                </div>
              </div>

              {/* Grid block */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Accuracy details */}
                <div className="card rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-4">Accuracy Breakdown</h3>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" barSize={14}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" stroke="#888888" fontSize={10} width={65} />
                          <Tooltip cursor={{ fill: "transparent" }} />
                          <Bar dataKey="value" radius={6} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                    Accuracy rates are logged to compile your central career timeline stats.
                  </p>
                </div>

                {/* Suggestions and Weak topics */}
                <div className="card rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-warning" /> Weak Topics Detected
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {weakTopics.map((topic, i) => (
                        <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-warning/10 text-warning border border-warning/20 font-semibold">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4 text-primary" /> Learning Action Plan
                    </h3>
                    <ul className="text-xs space-y-2 text-foreground/80 dark:text-white/70">
                      {suggestions.map((sug, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{sug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Reset Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setState("setup")}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Create New Quiz
                </button>
                <button
                  onClick={handleStartQuiz}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="h-4 w-4" /> Retake Same Quiz
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </AppShell>
  );
}
