import { useState, useRef, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Target, ArrowRight, Loader2, CheckCircle2,
  AlertTriangle, RotateCcw, Sparkles, Clock, ChevronRight,
  Award, TrendingUp, MessageSquare, Lightbulb, Play, Square,
  Camera, Check, ShieldCheck, HelpCircle, Volume2, Maximize, Minimize, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  generateFirstQuestion,
  generateFollowUpQuestion,
  evaluateFullInterview,
  saveInterviewResult
} from "@/lib/interview.functions";
import type { InterviewHistoryItem, FullInterviewEvaluation } from "@/lib/interview.functions";

type Screen = "setup" | "permissions" | "interview" | "evaluating" | "results";
type AIStatus = "idle" | "speaking" | "listening" | "thinking";

const CATEGORY_STYLES: Record<string, { gradient: string; text: string }> = {
  Technical: { gradient: "from-blue-500/20 to-cyan-500/20 border-blue-500/30", text: "text-blue-400" },
  Behavioral: { gradient: "from-emerald-500/20 to-green-500/20 border-emerald-500/30", text: "text-emerald-400" },
  Situational: { gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30", text: "text-amber-400" },
  "Problem Solving": { gradient: "from-purple-500/20 to-violet-500/20 border-purple-500/30", text: "text-purple-400" },
};

const TOTAL_QUESTIONS = 5;

export default function InterviewClient() {
  const genFirstQuestionFn = useServerFn(generateFirstQuestion);
  const genFollowUpFn = useServerFn(generateFollowUpQuestion);
  const evalInterviewFn = useServerFn(evaluateFullInterview);
  const saveResultFn = useServerFn(saveInterviewResult);

  // States
  const [screen, setScreen] = useState<Screen>("setup");
  const [targetRole, setTargetRole] = useState("");
  
  // Permissions
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionsState, setPermissionsState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  
  // Interview state
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{
    question: string;
    category: "Technical" | "Behavioral" | "Situational" | "Problem Solving";
    tips: string;
  } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Results state
  const [evaluation, setEvaluation] = useState<FullInterviewEvaluation | null>(null);
  const [isSavingResult, setIsSavingResult] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechSupported = typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  // Pre-load voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Update video element source object
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, screen]);

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Timer
  useEffect(() => {
    if (screen === "interview") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(v => v + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen]);

  // Stop video stream
  const stopMediaStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Fullscreen controls
  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error("Fullscreen request failed", err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error("Failed to exit fullscreen", err);
    }
  };

  // Request camera and microphone permissions
  const requestPermissions = async () => {
    setPermissionsState("requesting");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true
      });
      setStream(mediaStream);
      setPermissionsState("granted");
      toast.success("Camera and microphone permission granted.");
    } catch (err) {
      console.error("Permissions check failed:", err);
      setPermissionsState("denied");
      toast.error("Camera and microphone permissions are required to start the interview.");
    }
  };

  const startInterviewSetup = () => {
    if (!targetRole.trim()) {
      toast.error("Please enter a career role.");
      return;
    }
    setScreen("permissions");
    requestPermissions();
  };

  // Speak AI questions
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setAiStatus("listening");
      startRecording();
      return;
    }
    
    // Stop recording while speaking
    stopRecording();
    window.speechSynthesis.cancel();
    setAiStatus("speaking");

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))
    ) || voices.find(v => v.lang.startsWith("en"));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 1.0;

    utterance.onend = () => {
      setAiStatus("listening");
      startRecording();
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setAiStatus("listening");
      startRecording();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start continuous speech recognition
  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let finalTrans = "";
    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTrans += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTrans + interim);
    };

    rec.onerror = (e: any) => {
      console.warn("Speech recognition error:", e);
      if (e.error === "no-speech") return;
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  // Initialize and load first question
  const handleStartInterview = async () => {
    if (permissionsState !== "granted") {
      toast.error("Camera and Microphone permissions are required to start the interview.");
      return;
    }

    setAiStatus("thinking");
    setScreen("interview");
    
    // Request Fullscreen
    await enterFullscreen();

    try {
      const res = await genFirstQuestionFn({ data: { targetRole: targetRole.trim() } });
      setCurrentQuestion(res);
      setHistory([]);
      setTranscript("");
      speakText(res.question);
    } catch (err) {
      toast.error("Failed to generate first question.");
      handleExitInterview();
    }
  };

  // Handle submit answer
  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
      toast.error("Please provide an answer first. You can speak or type in the box.");
      return;
    }

    stopRecording();
    setAiStatus("thinking");

    const newHistoryItem: InterviewHistoryItem = {
      question: currentQuestion!.question,
      answer: transcript.trim(),
      category: currentQuestion!.category
    };

    const updatedHistory = [...history, newHistoryItem];
    setHistory(updatedHistory);
    setTranscript("");

    if (updatedHistory.length < TOTAL_QUESTIONS) {
      try {
        const nextQ = await genFollowUpFn({
          data: {
            targetRole: targetRole.trim(),
            history: updatedHistory
          }
        });
        setCurrentQuestion(nextQ);
        speakText(nextQ.question);
      } catch (err) {
        toast.error("Failed to generate follow-up question. Proceeding to evaluation.");
        handleFinishInterview(updatedHistory);
      }
    } else {
      handleFinishInterview(updatedHistory);
    }
  };

  // End Interview early or complete
  const handleFinishInterview = async (finalHistory: InterviewHistoryItem[]) => {
    setScreen("evaluating");
    setAiStatus("thinking");
    stopRecording();
    stopMediaStream();
    await exitFullscreen();

    try {
      const evalRes = await evalInterviewFn({
        data: {
          targetRole: targetRole.trim(),
          history: finalHistory
        }
      });
      setEvaluation(evalRes);
      
      // Save Result to DB
      setIsSavingResult(true);
      try {
        await saveResultFn({
          data: {
            targetRole: targetRole.trim(),
            questionsAnswers: evalRes.evaluations,
            score: evalRes.score
          }
        });
        toast.success("Interview report generated and saved successfully!");
      } catch (dbErr) {
        console.error("Failed to save to Supabase", dbErr);
        toast.warning("Evaluation compiled successfully (local only).");
      } finally {
        setIsSavingResult(false);
      }

      setScreen("results");
    } catch (err) {
      toast.error("Evaluation compilation failed.");
      setScreen("setup");
    }
  };

  const handleExitInterview = () => {
    stopRecording();
    stopMediaStream();
    exitFullscreen();
    setScreen("setup");
    setCurrentQuestion(null);
    setHistory([]);
    setTranscript("");
    setShowExitConfirm(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <AppShell>
      <div className="min-h-[85vh] flex flex-col justify-center py-4 relative">
        <AnimatePresence mode="wait">
          
          {/* ─── SCREEN: SETUP ─── */}
          {screen === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full py-6 px-4"
            >
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> AI Mock Interview Coach
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 tracking-tight">
                  Master Your Next Interview
                </h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                  Experience a high-fidelity interactive mock interview. Answer verbally, receive dynamic follow-ups, and get detailed AI feedback.
                </p>
              </div>

              <motion.div
                whileHover={{ y: -4 }}
                className="card rounded-3xl p-8 border border-border bg-card/45 backdrop-blur-lg hover:border-primary/30 hover:shadow-[0_0_40px_rgba(139,92,246,0.06)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-violet-500/25 text-primary border border-primary/20">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Target Career Role</h3>
                    <p className="text-xs text-muted-foreground">The AI will customize questions specifically to this field</p>
                  </div>
                </div>

                <input
                  type="text"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && startInterviewSetup()}
                  placeholder="e.g. Frontend Engineer, Product Manager, Data Analyst..."
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 mb-6 transition-all"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground mb-6">
                  <div className="flex items-center gap-2.5 bg-muted/30 border border-border/50 rounded-xl p-3.5">
                    <Volume2 className="h-4 w-4 text-primary" />
                    <span>Uses native speech synthesis</span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-muted/30 border border-border/50 rounded-xl p-3.5">
                    <Mic className="h-4 w-4 text-primary" />
                    <span>Real-time voice-to-text input</span>
                  </div>
                </div>

                <button
                  onClick={startInterviewSetup}
                  disabled={!targetRole.trim()}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary to-violet-600 px-6 py-4 text-sm font-bold text-white shadow-lg hover:shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                >
                  <Play className="h-4 w-4" /> Go to Permissions Setup
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ─── SCREEN: PERMISSIONS ─── */}
          {screen === "permissions" && (
            <motion.div
              key="permissions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full py-6 px-4"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold text-foreground mb-2 flex items-center justify-center gap-2">
                  <Camera className="h-6 w-6 text-primary" /> Set Up Device & Permissions
                </h1>
                <p className="text-xs text-muted-foreground">
                  Confirm your camera and microphone are operational before beginning the fullscreen interview.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 mb-8">
                
                {/* Device Video Preview */}
                <div className="card rounded-2xl border border-border bg-card/45 backdrop-blur-md overflow-hidden aspect-video flex flex-col justify-center items-center relative">
                  {permissionsState === "granted" && stream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <div className="text-center p-4">
                      {permissionsState === "requesting" ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                      ) : (
                        <Camera className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                      )}
                      <p className="text-xs text-muted-foreground font-semibold">Camera feed disabled or pending</p>
                    </div>
                  )}
                  {permissionsState === "granted" && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold text-white uppercase tracking-wider backdrop-blur-md">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Camera Active
                    </div>
                  )}
                </div>

                {/* Device Status Checklist */}
                <div className="card rounded-2xl border border-border bg-card/45 backdrop-blur-md p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground mb-2">Device Checks</h3>
                    
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <span className="text-xs text-muted-foreground font-medium">Camera Feed</span>
                      {permissionsState === "granted" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold"><CheckCircle2 className="h-4 w-4" /> Connected</span>
                      ) : permissionsState === "denied" ? (
                        <span className="flex items-center gap-1 text-xs text-red-400 font-bold"><AlertTriangle className="h-4 w-4" /> Blocked</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-bold">Waiting...</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <span className="text-xs text-muted-foreground font-medium">Microphone Feed</span>
                      {permissionsState === "granted" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold"><CheckCircle2 className="h-4 w-4" /> Connected</span>
                      ) : permissionsState === "denied" ? (
                        <span className="flex items-center gap-1 text-xs text-red-400 font-bold"><AlertTriangle className="h-4 w-4" /> Blocked</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-bold">Waiting...</span>
                      )}
                    </div>
                  </div>

                  {permissionsState === "denied" && (
                    <div className="flex gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-3 text-xs text-red-400 mt-4 leading-relaxed">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Permission Denied.</strong> You must grant camera and microphone access. Click the lock icon in your browser address bar to reset.
                      </div>
                    </div>
                  )}

                  {permissionsState === "granted" && (
                    <div className="flex gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3 text-xs text-emerald-400 mt-4 leading-relaxed">
                      <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Devices Ready.</strong> Click the start button below to initiate fullscreen mode and begin your mock interview.
                      </div>
                    </div>
                  )}

                  {permissionsState !== "granted" && permissionsState !== "denied" && (
                    <button
                      onClick={requestPermissions}
                      className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-primary/45 bg-primary/10 hover:bg-primary/20 py-2.5 text-xs font-bold text-primary transition-colors cursor-pointer"
                    >
                      Retry Permission Check
                    </button>
                  )}
                </div>

              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { stopMediaStream(); setScreen("setup"); }}
                  className="flex-1 rounded-xl border border-border bg-muted/40 hover:bg-muted/75 py-3.5 text-xs font-bold text-foreground transition-colors cursor-pointer"
                >
                  Back to Setup
                </button>
                <button
                  onClick={handleStartInterview}
                  disabled={permissionsState !== "granted"}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 py-3.5 text-xs font-bold text-white shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Play className="h-4 w-4" /> Accept & Start Interview
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── SCREEN: INTERVIEW ─── */}
          {screen === "interview" && (
            <motion.div
              key="interview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto w-full px-4 flex flex-col justify-between h-[90vh] py-2"
            >
              {/* INTERVIEW HEADER */}
              <div className="flex items-center justify-between border-b border-border bg-card/25 backdrop-blur-md rounded-2xl p-4 mb-4 shadow-sm border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs uppercase font-extrabold text-foreground tracking-wider">
                    Interviewing for: <span className="text-primary font-black">{targetRole}</span>
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/50 border border-border px-3 py-1 rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-primary" /> {formatTime(elapsed)}
                  </div>
                  <button
                    onClick={() => setShowExitConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-1.5 text-xs font-extrabold text-red-400 transition-colors cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-red-400/20" /> End Interview
                  </button>
                </div>
              </div>

              {/* MAIN CONTENT GRID */}
              <div className="grid gap-6 md:grid-cols-2 flex-1 mb-4 min-h-0">
                
                {/* COLUMN 1: AI INTERVIEWER */}
                <div className="card rounded-3xl border border-border bg-card/45 backdrop-blur-lg p-6 flex flex-col justify-between relative overflow-hidden group shadow-md flex-1">
                  
                  {/* Glowing ambient light inside the card */}
                  <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-[80px] transition-all duration-1000 ${
                    aiStatus === "speaking" ? "bg-primary/20 scale-125" :
                    aiStatus === "listening" ? "bg-emerald-500/20 scale-100" : "bg-primary/10"
                  }`} />

                  {/* AI Status Title */}
                  <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3 relative z-10">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" /> AI Interviewer
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      aiStatus === "speaking" ? "text-primary border-primary/30 bg-primary/10" :
                      aiStatus === "listening" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                      "text-muted-foreground border-border bg-muted/30"
                    }`}>
                      {aiStatus === "speaking" ? "AI Speaking" :
                       aiStatus === "listening" ? "Listening..." : "Thinking..."}
                    </span>
                  </div>

                  {/* Dynamic Voice Visualizer & Avatar */}
                  <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6">
                    <div className="relative w-36 h-36 rounded-full mb-6 flex items-center justify-center">
                      
                      {/* Pulse rings during Speaking */}
                      <AnimatePresence>
                        {aiStatus === "speaking" && (
                          <>
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-primary/40 bg-primary/5"
                              initial={{ scale: 0.9, opacity: 0.8 }}
                              animate={{ scale: 1.5, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            />
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-violet-500/30"
                              initial={{ scale: 0.9, opacity: 0.8 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 2, delay: 0.6, repeat: Infinity, ease: "easeOut" }}
                            />
                          </>
                        )}
                      </AnimatePresence>

                      {/* Quiet ripple during Listening */}
                      <AnimatePresence>
                        {aiStatus === "listening" && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-emerald-500/30 bg-emerald-500/5"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Main Orb */}
                      <div className={`w-28 h-28 rounded-full bg-gradient-to-br transition-all duration-500 flex items-center justify-center border-4 ${
                        aiStatus === "speaking" ? "from-primary to-violet-600 border-primary/30 shadow-[0_0_35px_rgba(139,92,246,0.35)]" :
                        aiStatus === "listening" ? "from-emerald-500 to-teal-600 border-emerald-500/30 shadow-[0_0_35px_rgba(16,185,129,0.35)]" :
                        "from-muted to-slate-700 border-border shadow-md"
                      }`}>
                        <Sparkles className="h-10 w-10 text-white animate-pulse" />
                      </div>
                    </div>

                    {/* Speech Bar visualizer (Framer Motion) */}
                    <div className="flex items-center gap-1.5 h-6 mb-2">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className={`w-1 rounded-full ${
                            aiStatus === "speaking" ? "bg-primary" :
                            aiStatus === "listening" ? "bg-emerald-400" : "bg-muted-foreground/35"
                          }`}
                          style={{ height: "4px" }}
                          animate={
                            aiStatus === "speaking" ? { height: ["4px", "24px", "8px", "20px", "4px"][i % 5] } :
                            aiStatus === "listening" ? { height: ["4px", "10px", "4px", "12px", "4px"][i % 5] } :
                            { height: 4 }
                          }
                          transition={
                            aiStatus !== "idle" && aiStatus !== "thinking" ? {
                              duration: 0.8 + i * 0.1,
                              repeat: Infinity,
                              repeatType: "reverse",
                              ease: "easeInOut"
                            } : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Question Prompt Display */}
                  <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 relative z-10">
                    {currentQuestion ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border bg-gradient-to-r ${
                            CATEGORY_STYLES[currentQuestion.category]?.gradient || "from-gray-500/10 to-gray-400/10 border-gray-500/35"
                          } ${CATEGORY_STYLES[currentQuestion.category]?.text || "text-gray-400"}`}>
                            {currentQuestion.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Question {history.length + 1} of {TOTAL_QUESTIONS}
                          </span>
                        </div>
                        
                        <h2 className="text-sm font-bold text-foreground leading-relaxed mb-3">
                          {currentQuestion.question}
                        </h2>

                        <div className="flex gap-1.5 text-[10px] text-muted-foreground bg-black/10 rounded-xl p-3 border border-white/5">
                          <Lightbulb className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                          <div>
                            <strong>Coach Tip:</strong> {currentQuestion.tips}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex py-6 justify-center items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Loading next question...</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMN 2: CANDIDATE VIEW & TRANSCRIPT */}
                <div className="flex flex-col gap-6 flex-1 min-h-0">
                  
                  {/* Live Webcam Box */}
                  <div className="card rounded-3xl border border-border bg-card/45 backdrop-blur-lg overflow-hidden aspect-video relative shadow-md group">
                    {stream ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col justify-center items-center bg-muted/40">
                        <Camera className="h-8 w-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs text-muted-foreground">Camera feed unavailable</p>
                      </div>
                    )}
                    
                    {/* Bounding box grid details for high-tech aesthetic */}
                    <div className="absolute inset-4 border border-dashed border-white/5 rounded-2xl pointer-events-none" />
                    
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" /> Live Camera
                    </div>

                    <div className="absolute bottom-3 right-3 text-[9px] font-mono font-bold text-white/50 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">
                      FPS: 30 · 480p
                    </div>
                  </div>

                  {/* Speech to Text Capture */}
                  <div className="card rounded-3xl border border-border bg-card/45 backdrop-blur-lg p-5 flex flex-col justify-between flex-1 relative min-h-0">
                    
                    <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-primary" /> Speech-to-Text Response
                      </h3>

                      {speechSupported && (
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={aiStatus === "speaking"}
                          className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold border transition-all cursor-pointer ${
                            isRecording
                              ? "bg-red-500/15 text-red-400 border-red-500/30"
                              : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {isRecording && (
                            <motion.span
                              className="absolute inset-0 rounded-xl border border-red-500/40"
                              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}
                          {isRecording ? <><Square className="h-3 w-3 fill-red-400/20" /> Pause Mic</> : <><Mic className="h-3 w-3" /> Record Answer</>}
                        </button>
                      )}
                    </div>

                    <textarea
                      value={transcript}
                      onChange={e => setTranscript(e.target.value)}
                      placeholder={speechSupported ? "Double check your mic. When the AI finishes speaking, this box will capture your response automatically. You can also type inside here..." : "Type your answer here..."}
                      className="w-full flex-1 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none mb-3 min-h-[100px] leading-relaxed transition-all"
                    />

                    {/* Microphone status alert */}
                    {isRecording && (
                      <div className="flex items-center gap-2 text-[10px] text-red-400 font-semibold mb-3">
                        <motion.span
                          className="h-2.5 w-2.5 rounded-full bg-red-500"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        Capturing speech... speak clearly into your microphone.
                      </div>
                    )}
                    
                    {!isRecording && speechSupported && aiStatus === "listening" && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 mb-3 leading-snug">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>Microphone is paused. Click <strong>Record Answer</strong> or type to provide your response.</span>
                      </div>
                    )}

                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!transcript.trim() || aiStatus === "speaking"}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 px-6 py-3.5 text-xs font-bold text-white shadow-md hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Submit Response & Continue <ArrowRight className="h-4 w-4" />
                    </button>

                  </div>

                </div>

              </div>

              {/* PROGRESS BAR BAR */}
              <div className="card border border-border/80 bg-card/25 backdrop-blur-md rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                  <span>INTERVIEW COMPLETION PROGRESS</span>
                  <span>{Math.round((history.length / TOTAL_QUESTIONS) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(history.length / TOTAL_QUESTIONS) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* EXIT CONFIRMATION MODAL */}
              <AnimatePresence>
                {showExitConfirm && (
                  <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-card text-foreground border border-border p-6 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.4)]"
                    >
                      <h3 className="text-base font-black text-foreground mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-400" /> End Mock Interview?</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                        Are you sure you want to end this interview session? If you exit now, we will evaluate your performance based only on the answers you have submitted so far ({history.length} answered).
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowExitConfirm(false)}
                          className="flex-1 rounded-xl border border-border hover:bg-muted py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setShowExitConfirm(false);
                            if (history.length > 0) {
                              handleFinishInterview(history);
                            } else {
                              handleExitInterview();
                            }
                          }}
                          className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
                        >
                          Yes, End Interview
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </motion.div>
          )}

          {/* ─── SCREEN: EVALUATING ─── */}
          {screen === "evaluating" && (
            <motion.div
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid min-h-[60vh] place-items-center"
            >
              <div className="text-center bg-card/45 border border-border/80 backdrop-blur-lg rounded-3xl p-10 max-w-sm shadow-lg">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-5" />
                <h3 className="text-base font-black text-foreground mb-2">Analyzing Responses</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  The AI is conducting a comprehensive evaluation of your technical depth, behavioral structure, and domain vocabulary. Please wait...
                </p>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── SCREEN: RESULTS ─── */}
          {screen === "results" && evaluation && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto w-full py-6 px-4"
            >
              {/* Overall Score Header */}
              <div className="text-center mb-8 bg-card/45 border border-border rounded-3xl p-8 backdrop-blur-lg relative overflow-hidden shadow-md">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-violet-500" />
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 border-4 border-primary/20 mb-4 shadow-sm"
                >
                  <span className="text-3xl font-black text-primary">{evaluation.score}</span>
                </motion.div>

                <h1 className="text-2xl font-black text-foreground mb-2">Mock Interview Feedback</h1>
                <p className="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  {evaluation.feedback}
                </p>

                {isSavingResult && (
                  <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 mt-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving report to database...
                  </span>
                )}
              </div>

              {/* Question Breakdown List */}
              <div className="space-y-6 mb-8">
                <h3 className="text-sm font-bold text-foreground tracking-wider uppercase">Detailed Question Breakdown</h3>

                {evaluation.evaluations.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="card rounded-3xl border border-border bg-card/35 backdrop-blur-md p-6 shadow-sm hover:border-primary/20 transition-all"
                  >
                    {/* Top Row: Category and Score */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 inline-flex items-center rounded-lg px-2.5 py-0.5 text-[9px] font-bold bg-gradient-to-r ${
                          CATEGORY_STYLES[item.category]?.gradient || "from-gray-500/15 to-gray-400/15"
                        } ${CATEGORY_STYLES[item.category]?.text || "text-gray-400"}`}>
                          {item.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Question {idx + 1}</span>
                      </div>
                      <span className={`text-sm font-black ${
                        item.score >= 8 ? "text-emerald-400" :
                        item.score >= 5 ? "text-amber-400" : "text-red-400"
                      }`}>
                        Score: {item.score}/10
                      </span>
                    </div>

                    {/* Question and Answer */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Question</span>
                        <p className="text-xs text-foreground font-bold">{item.question}</p>
                      </div>
                      <div className="bg-muted/30 border border-border/50 rounded-xl p-3.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Your Response</span>
                        <p className="text-xs text-foreground italic leading-relaxed">"{item.answer}"</p>
                      </div>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                        <h4 className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1.5 mb-2.5 uppercase tracking-wide">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                        </h4>
                        <ul className="space-y-1.5">
                          {item.strengths.map((s, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                              <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                        <h4 className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1.5 mb-2.5 uppercase tracking-wide">
                          <TrendingUp className="h-3.5 w-3.5" /> Suggestions
                        </h4>
                        <ul className="space-y-1.5">
                          {item.improvements.map((imp, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                              <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Model Answer */}
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                      <h4 className="text-[10px] font-extrabold text-primary flex items-center gap-1.5 mb-2 uppercase tracking-wide">
                        <Award className="h-3.5 w-3.5" /> Ideal Model Response
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.sampleAnswer}</p>
                    </div>

                  </motion.div>
                ))}
              </div>

              {/* Actions Footer */}
              <button
                onClick={() => setScreen("setup")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 px-6 py-4 text-sm font-bold text-white shadow-lg hover:shadow-primary/25 transition-all cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Start A New Interview
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </AppShell>
  );
}
