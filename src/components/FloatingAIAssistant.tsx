// src/components/FloatingAIAssistant.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { askChatbot } from "@/lib/analysis.functions";
import {
  Sparkles, X, Send, Bot, TrendingUp, FolderOpen, Map,
  HelpCircle, Lightbulb, ArrowRight, Loader2, User,
  Clock, ArrowLeft, Trash2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Quick action chips ─────────────────────────────────────
const QUICK_CHIPS = [
  { id: "ats", icon: TrendingUp, label: "Improve ATS Score", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { id: "projects", icon: FolderOpen, label: "Suggest Projects", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { id: "roadmap", icon: Map, label: "Learning Roadmap", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { id: "interview", icon: HelpCircle, label: "Interview Questions", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  { id: "skills", icon: Lightbulb, label: "Explain Missing Skills", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
];

// ─── Knowledge base for AI responses ────────────────────────
const KNOWLEDGE_BASE: Record<string, string> = {
  ats: `Great question! Here's how to boost your ATS score:

**1. Keyword Optimization**
Add role-specific keywords like React, Node.js, TypeScript, AWS right at the top of your Skills section.

**2. Standard Section Headers**
Use exactly: "Experience", "Education", "Skills", "Projects" — ATS engines look for these.

**3. Quantify Everything**
Replace "improved performance" with "↑ API response time by 40%". Numbers get noticed.

**4. Clean Formatting**
• No tables, columns, or images
• Use standard bullet points
• Stick to PDF format with a text layer

**5. Tailor Per Application**
Mirror the exact keywords from the job description. Each application should have a custom resume.

Upload your resume on the Dashboard for a detailed ATS breakdown! 🎯`,

  projects: `Here are high-impact projects tailored for different career paths:

**🔨 Full Stack Development**
• Real-time collaborative task board (React + Socket.io + PostgreSQL)
• E-commerce platform with payment integration (Next.js + Stripe)

**🤖 AI & Machine Learning**
• Resume parser with NLP (Python + spaCy + FastAPI)
• Sentiment analysis dashboard (HuggingFace + Streamlit)

**📊 Data Engineering**
• Real-time analytics pipeline (Kafka + Spark + Grafana)
• Stock price prediction model with live dashboard

**☁️ Cloud & DevOps**
• CI/CD pipeline with Docker + GitHub Actions
• Serverless REST API on AWS Lambda

**💡 Pro Tip**: Pick one project that directly matches your target role and build it end-to-end with tests and documentation. Quality > quantity! 🚀`,

  roadmap: `Here's your personalized 8-week career acceleration plan:

**📅 Week 1-2: Foundation**
• Solidify DSA fundamentals (arrays, trees, graphs)
• System design basics (load balancing, caching)
• Daily LeetCode practice (2 problems/day)

**📅 Week 3-4: Frontend Mastery**
• React + TypeScript deep dive
• State management (Zustand/Redux Toolkit)
• Build a portfolio website

**📅 Week 5-6: Backend & APIs**
• Node.js + Express.js architecture
• Database design (PostgreSQL + Prisma)
• Authentication & authorization patterns

**📅 Week 7: DevOps & Deployment**
• Docker containerization
• CI/CD with GitHub Actions
• Cloud deployment (AWS/Vercel)

**📅 Week 8: Career Launch**
• Resume optimization (use Disha AI!)
• Mock interviews practice
• Portfolio & GitHub cleanup

Upload your resume to get a version customized to your exact skill gaps! 📈`,

  interview: `Top interview questions for software engineering roles:

**🧠 Technical Fundamentals**
1. Explain the event loop in Node.js
2. What's the difference between SQL and NoSQL databases?
3. How does React's virtual DOM work?
4. Explain REST vs GraphQL — when to use each?
5. What is CORS and how do you handle it?

**💡 System Design**
6. Design a URL shortener like bit.ly
7. How would you build a real-time chat system?
8. Design a rate limiter for an API

**🎯 Behavioral**
9. Tell me about a time you debugged a complex production issue
10. How do you prioritize tasks when everything seems urgent?
11. Describe a project where you had to learn a new technology quickly

**✨ Pro Tips**
• Use the STAR method for behavioral questions
• Always discuss trade-offs in system design
• Ask clarifying questions before diving into solutions

Want role-specific questions? Run a resume analysis first! 🎯`,

  skills: `Based on typical Full Stack Developer requirements, here are commonly missing skills and how to learn them:

**🔷 TypeScript** (2 weeks)
Strongly typed JavaScript. Start with the official TypeScript Handbook, then convert a small JS project.

**🐳 Docker** (1 week)
Containerization essential for modern deployment. Try the "Docker Getting Started" tutorial on docs.docker.com.

**⚡ Redis** (1 week)
In-memory caching and session management. Complete Redis University's free RU101 course.

**📡 GraphQL** (2 weeks)
Modern API query language. Build a small Apollo Server project with React client.

**☁️ AWS Basics** (2 weeks)
Cloud computing fundamentals. Start with AWS Free Tier — deploy an EC2 instance and S3 bucket.

**🧪 Testing** (1 week)
Jest + React Testing Library for unit tests, Cypress for E2E.

Run a resume analysis on the Dashboard to discover your **exact** skill gaps! 🔍`,
};

// ─── Smart response generator ───────────────────────────────
function generateResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  // Check for quick-action keyword matches first
  if (lower.includes("ats") || lower.includes("applicant tracking") || lower.includes("parsing"))
    return KNOWLEDGE_BASE.ats;
  if (lower.includes("project") || lower.includes("build") || lower.includes("portfolio"))
    return KNOWLEDGE_BASE.projects;
  if (lower.includes("roadmap") || lower.includes("learning path") || lower.includes("study plan") || lower.includes("career plan"))
    return KNOWLEDGE_BASE.roadmap;
  if (lower.includes("interview") || lower.includes("question") || lower.includes("prepare"))
    return KNOWLEDGE_BASE.interview;
  if (lower.includes("skill") || lower.includes("missing") || lower.includes("gap") || lower.includes("learn"))
    return KNOWLEDGE_BASE.skills;

  // Resume-related
  if (lower.includes("resume") || lower.includes("cv")) {
    return `Great question about your resume! Here's what I recommend:

**Key Resume Tips:**
• Keep it to 1 page for < 5 years of experience
• Use action verbs: "Developed", "Architected", "Optimized"
• Quantify impact with numbers and percentages
• Include a "Technical Skills" section at the top
• Match keywords from the job description

Head to the **Dashboard** to upload your resume for a full AI-powered analysis including ATS compatibility, skill gap detection, and a personalized roadmap! 📄✨`;
  }

  // Career advice
  if (lower.includes("career") || lower.includes("job") || lower.includes("hire") || lower.includes("salary")) {
    return `Here's some career guidance:

**🎯 For Job Search:**
• Customize your resume for each application
• Network on LinkedIn — 70% of jobs come through connections
• Contribute to open source projects for visibility
• Practice DSA daily on LeetCode/HackerRank

**💰 Salary Negotiation:**
• Research market rates on levels.fyi and Glassdoor
• Always negotiate — most offers have 10-20% flexibility
• Highlight your unique value and impact metrics

**📈 Career Growth:**
• Set a clear 1-year and 3-year goal
• Build a personal brand through blogging or speaking
• Seek mentorship from senior engineers

Use Disha AI's career readiness score to track your progress! 🚀`;
  }

  // Greeting
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.match(/^(yo|sup|hola)/)) {
    return `Hey there! 👋 I'm your Disha AI career coach.

I can help you with:
• 📊 **ATS Score** optimization tips
• 🔨 **Project ideas** for your portfolio
• 🗺️ **Learning roadmaps** tailored to your goals
• 🎯 **Interview preparation** questions
• 💡 **Skill gap** analysis and learning resources

Just type your question or tap one of the quick actions below! What would you like to explore? ✨`;
  }

  // Thank you
  if (lower.includes("thank") || lower.includes("thanks")) {
    return `You're welcome! 😊 I'm always here to help with your career journey.

Feel free to ask me anything about:
• Resume optimization
• Skill development
• Interview preparation
• Career planning

Keep pushing forward — you've got this! 💪🚀`;
  }

  // Default contextual response
  return `That's a great question! Let me help you with that.

Based on your query, here are some relevant suggestions:

**📊 Analyze Your Profile**
Upload your resume on the Dashboard for a comprehensive AI evaluation — including ATS compatibility, skill gaps, and a personalized learning roadmap.

**🧠 Test Your Knowledge**
Try the Quiz AI module to assess your understanding of key concepts for your target role.

**💻 Practice Coding**
Use the Lab Evaluator to submit code challenges and get instant AI feedback.

**💡 Quick Actions**
You can also try asking me about:
• "How to improve my ATS score?"
• "Suggest projects for my portfolio"
• "Create a learning roadmap"
• "Interview questions for my role"
• "What skills am I missing?"

What would you like to dive into? 🎯`;
}

// ─── Unique ID generator ────────────────────────────────────
let msgIdCounter = 0;
function newMsgId() {
  return `msg-${Date.now()}-${++msgIdCounter}`;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

// ─── Component ──────────────────────────────────────────────
export function FloatingAIAssistant() {
  const askAIFn = useServerFn(askChatbot);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! 👋 I'm your **Disha AI** career coach. Ask me anything about resume optimization, skill gaps, interview prep, or career planning — or tap a quick action below!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // History & guided flow state
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `session-${Date.now()}`);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [pendingFlow, setPendingFlow] = useState<null | "ats_project">(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync session saving helper
  const saveSession = useCallback((sessionMessages: ChatMessage[], sessionId: string) => {
    if (sessionMessages.length <= 1 && sessionMessages[0]?.id === "welcome") return;

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === sessionId);
      let title = prev[idx]?.title || "";
      
      if (!title) {
        const firstUserMsg = sessionMessages.find((m) => m.role === "user");
        title = firstUserMsg ? firstUserMsg.content.slice(0, 40) : "New Chat";
      }

      const updatedSession: ChatSession = {
        id: sessionId,
        title,
        messages: sessionMessages,
        lastUpdated: Date.now(),
      };

      const newSessions = [...prev];
      if (idx >= 0) {
        newSessions[idx] = updatedSession;
      } else {
        newSessions.unshift(updatedSession);
      }

      newSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
      localStorage.setItem("disha_chatbot_sessions", JSON.stringify(newSessions));
      return newSessions;
    });
  }, []);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("disha_chatbot_sessions");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatSession[];
        setSessions(parsed);
        if (parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => b.lastUpdated - a.lastUpdated);
          setCurrentSessionId(sorted[0].id);
          setMessages(sorted[0].messages);
        }
      } catch (e) {
        console.error("Failed to parse stored sessions", e);
      }
    }
  }, []);

  // Auto-scroll to newest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom, view]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && view === "chat") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, view]);

  async function handleSend(text?: string) {
    const msg = (text || inputValue).trim();
    if (!msg) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: newMsgId(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    
    const updatedMessagesWithUser = [...messages, userMsg];
    setMessages(updatedMessagesWithUser);
    saveSession(updatedMessagesWithUser, currentSessionId);
    
    setInputValue("");
    setIsTyping(true);

    try {
      let response = "";

      if (pendingFlow === "ats_project") {
        setPendingFlow(null);
        try {
          const aiResponse = await askAIFn({
            data: {
              message: `Evaluate the ATS compatibility of this project and suggest how to format/write it in a resume to achieve high ATS scores: "${msg}". Include action verbs, metrics to quantify, and relevant keywords.`,
              history: messages.map(m => ({ role: m.role, content: m.content }))
            }
          });
          response = aiResponse;
        } catch (err) {
          console.error("AI chatbot query failed, using offline response...", err);
          response = `Here is how to optimize your project **${msg}** for ATS compatibility:
          
**1. Use Strong Action Verbs**
Instead of "built" or "worked on", write:
• *Architected* a responsive ${msg} frontend...
• *Optimized* database queries in ${msg} to...

**2. Quantify the Impact**
Add numbers. E.g.: "Reduced page load time by 30%" or "Integrated Stripe payment processing, handling $10k+ transactions."

**3. List Key Technologies**
In the project bullet points, explicitly list keywords: React, Node.js, REST APIs, TypeScript, etc., so ATS parsers pick them up.

**4. Keep formatting clean**
Stick to standard bullet points and avoid multi-column tables for the project section.`;
        }
      } else if (msg.toLowerCase().includes("ats") || msg === "Improve ATS Score") {
        response = `I can help you analyze the ATS compatibility of your project! 🎯

**Which project's ATS compatibility do you want to check?** 
Please enter your project name or a brief description (e.g., "E-commerce store in React" or "Python data scraper").`;
        setPendingFlow("ats_project");
      } else {
        try {
          const aiResponse = await askAIFn({
            data: {
              message: msg,
              history: messages.map(m => ({ role: m.role, content: m.content }))
            }
          });
          response = aiResponse;
        } catch (err) {
          console.error("AI chatbot query failed, using offline response...", err);
          response = generateResponse(msg);
        }
      }

      const assistantMsg: ChatMessage = {
        id: newMsgId(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessagesWithUser, assistantMsg];
      setIsTyping(false);
      setMessages(finalMessages);
      saveSession(finalMessages, currentSessionId);
    } catch (err) {
      console.error("Chatbot response generation failed", err);
      setIsTyping(false);
      const errorMsg: ChatMessage = {
        id: newMsgId(),
        role: "assistant",
        content: "Sorry, I ran into an error. Please try again, or click Back to options.",
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessagesWithUser, errorMsg];
      setMessages(finalMessages);
      saveSession(finalMessages, currentSessionId);
    }
  }

  function handleCancelFlow() {
    setPendingFlow(null);
    const cancelMsg: ChatMessage = {
      id: newMsgId(),
      role: "assistant",
      content: "Guided check cancelled. What else would you like to explore? ✨",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, cancelMsg]);
  }

  function handleStartNewChat() {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! 👋 I'm your **Disha AI** career coach. Ask me anything about resume optimization, skill gaps, interview prep, or career planning — or tap a quick action below!",
        timestamp: new Date(),
      },
    ]);
    setPendingFlow(null);
    setView("chat");
  }

  function handleSelectSession(session: ChatSession) {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setPendingFlow(null);
    setView("chat");
  }

  function handleDeleteSession(sessionId: string) {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      localStorage.setItem("disha_chatbot_sessions", JSON.stringify(filtered));
      
      if (sessionId === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
          setMessages(filtered[0].messages);
        } else {
          const newId = `session-${Date.now()}`;
          setCurrentSessionId(newId);
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: "Hi! 👋 I'm your **Disha AI** career coach. Ask me anything about resume optimization, skill gaps, interview prep, or career planning — or tap a quick action below!",
              timestamp: new Date(),
            },
          ]);
        }
      }
      return filtered;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuickChip(chip: typeof QUICK_CHIPS[0]) {
    handleSend(chip.label);
  }

  // Format markdown-like bold text
  function formatContent(content: string) {
    // Split by lines, process bold markers and bullet points
    return content.split("\n").map((line, i) => {
      // Process bold text **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formatted = parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={j} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <span key={i}>
          {formatted}
          {i < content.split("\n").length - 1 && <br />}
        </span>
      );
    });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-16 right-0 w-[360px] sm:w-[400px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
            style={{
              boxShadow: "0 20px 60px rgba(109,94,247,0.25)",
              maxHeight: "min(600px, calc(100vh - 120px))",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: "linear-gradient(135deg, #6D5EF7, #4F8CFF)" }}
            >
              <div className="flex items-center gap-2.5">
                {view === "history" ? (
                  <button
                    onClick={() => setView("chat")}
                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Back to Chat"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Bot className="h-4.5 w-4.5 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">
                    {view === "history" ? "Chat History" : "Disha AI Assistant"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[10px] text-white/70">
                      {view === "history" ? `${sessions.length} Saved Chats` : "Online • Career Coach"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {view === "chat" && (
                  <button
                    onClick={() => setView("history")}
                    className="h-7 w-7 rounded-lg flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                    title="View History"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* History List or Active Chat View */}
            {view === "history" ? (
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col min-h-0 bg-background/50 scrollbar-thin">
                <div className="flex-1 flex flex-col min-h-0 justify-between">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Past Conversations</span>
                      <button
                        onClick={handleStartNewChat}
                        className="text-[10px] text-primary hover:underline font-bold"
                      >
                        + Start New Chat
                      </button>
                    </div>
                    
                    {sessions.length === 0 ? (
                      <div className="text-center py-16 text-xs text-muted-foreground">
                        No saved conversations yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              session.id === currentSessionId
                                ? "bg-primary/5 border-primary/20 hover:bg-primary/8"
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            }`}
                            onClick={() => handleSelectSession(session)}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-xs font-semibold truncate text-foreground">
                                {session.title || "Untitled Chat"}
                              </p>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(session.lastUpdated).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              title="Delete Session"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-border mt-auto">
                    <button
                      onClick={handleStartNewChat}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all text-center"
                    >
                      Start New Chat Session
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 scrollbar-thin">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          msg.role === "assistant"
                            ? "bg-gradient-to-br from-primary to-secondary text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === "assistant"
                            ? "bg-muted/50 text-foreground rounded-bl-md"
                            : "bg-primary text-white rounded-br-md"
                        }`}
                      >
                        {msg.role === "assistant"
                          ? formatContent(msg.content)
                          : msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                      <div className="shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                        <motion.span
                          className="h-1.5 w-1.5 rounded-full bg-primary/60"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        />
                        <motion.span
                          className="h-1.5 w-1.5 rounded-full bg-primary/60"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                        />
                        <motion.span
                          className="h-1.5 w-1.5 rounded-full bg-primary/60"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Action Chips — show only when there are few messages and not in pending flow */}
                {messages.length <= 2 && !pendingFlow && (
                  <div className="px-4 pb-2 shrink-0">
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_CHIPS.map((chip) => {
                        const Icon = chip.icon;
                        return (
                          <button
                            key={chip.id}
                            onClick={() => handleQuickChip(chip)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-semibold transition-all hover:opacity-80 ${chip.color}`}
                          >
                            <Icon className="h-3 w-3" />
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pending Flow Info Banner */}
                {pendingFlow === "ats_project" && (
                  <div className="px-4 py-2 bg-primary/8 border-t border-b border-primary/20 flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-primary font-medium flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5" /> Project ATS Check mode
                    </span>
                    <button
                      onClick={handleCancelFlow}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded bg-muted hover:bg-muted/80 transition-all border border-border"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back / Cancel
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all px-3 py-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={pendingFlow === "ats_project" ? "Type your project name or description..." : "Ask me anything about your career..."}
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none py-2"
                      disabled={isTyping}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!inputValue.trim() || isTyping}
                      className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-primary text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
                    >
                      {isTyping ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[8px] text-muted-foreground text-center mt-1.5">
                    Powered by Disha AI • Career Intelligence Engine
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        id="ai-assistant-toggle"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm text-white shadow-lg"
        style={{
          background: "linear-gradient(135deg, #6D5EF7, #4F8CFF)",
          boxShadow: "0 8px 32px rgba(109,94,247,0.4)",
        }}
        aria-label="Open AI Assistant"
      >
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {open ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </motion.div>
        <span className="hidden sm:block">{open ? "Close" : "Disha AI"}</span>
        {/* Ambient glow pulse */}
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            style={{ background: "rgba(109,94,247,0.3)", zIndex: -1 }}
          />
        )}
      </motion.button>
    </div>
  );
}
