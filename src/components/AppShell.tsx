import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  LogOut, LayoutDashboard, User as UserIcon, Sun, Moon, Brain, Code,
  Sparkles, Menu, X, ChevronRight, ChevronLeft, Mic
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { DishaLogo } from "@/components/DishaLogo";
import { NotificationCenter } from "@/components/NotificationCenter";
import { FloatingAIAssistant } from "@/components/FloatingAIAssistant";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import type { ReactNode } from "react";

/* ─── Sidebar width tokens ─── */
const SIDEBAR_W = 260;   // px expanded
const SIDEBAR_COLLAPSED = 0; // Completely hidden when collapsed (interactive click-outside to hide)

/* ─── 3D perspective wrapper for nav items ─── */
function Nav3DItem({
  children,
  isActive,
  delay = 0,
}: {
  children: React.ReactNode;
  isActive: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24, rotateY: -35 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 120, damping: 16 }}
      whileHover={{
        rotateY: 8,
        scale: 1.04,
        z: 20,
        transition: { duration: 0.25, ease: "easeOut" },
      }}
      style={{ perspective: 800, transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Floating particles inside sidebar ─── */
function SidebarParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3 + Math.random() * 4,
            height: 3 + Math.random() * 4,
            left: `${15 + Math.random() * 70}%`,
            top: `${10 + Math.random() * 80}%`,
            background: `rgba(124, 58, 237, ${0.15 + Math.random() * 0.2})`,
          }}
          animate={{
            y: [0, -20 - Math.random() * 30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // Default to collapsed/hidden for a clean start
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const name =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const initial = name.charAt(0).toUpperCase();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Quiz AI",   path: "/quiz",      icon: Brain },
    { name: "Lab",       path: "/lab",        icon: Code },
    { name: "Interview", path: "/interview",  icon: Mic },
    { name: "Profile",   path: "/profile",    icon: UserIcon },
  ];

  // Auto-hide sidebar when clicking or touching outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (collapsed) return;
      
      // Check if click was outside sidebar and outside the toggle button
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target as Node)
      ) {
        setCollapsed(true);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [collapsed]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate({ to: "/" });
  }

  // Active page name helper
  const getActivePageName = () => {
    const activeItem = navItems.find(item => location.pathname.startsWith(item.path));
    return activeItem ? activeItem.name : "Disha AI";
  };

  return (
    <div className="relative flex min-h-screen bg-background text-foreground transition-colors duration-300 overflow-x-hidden">

      {/* ── Global Animated Background Decor (User-Friendly EdTech Vibe) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Subtle dot grid pattern */}
        <div className="absolute inset-0 bg-dot-grid opacity-[0.7] dark:opacity-[0.35]" />
        
        {/* Floating blurred ambient orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full bg-secondary/10 dark:bg-secondary/5 blur-[100px] animate-float-reverse" />
        
        {/* Additional accent blob for rich visual feedback */}
        <div className="absolute top-[40%] right-[15%] w-[25vw] h-[25vw] max-w-[300px] max-h-[300px] rounded-full bg-pink-500/6 dark:bg-pink-500/3 blur-[90px] animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* ── Sidebar Overlay (blurred background when sidebar is open) ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ── Left Sidebar ─────────────────────────────────── */}
      <motion.aside
        ref={sidebarRef}
        initial={{ width: 0 }}
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_W }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-card/95 backdrop-blur-xl overflow-hidden select-none"
        style={{ perspective: 1000 }}
      >
        {/* Gradient accent edge */}
        <div
          className="absolute right-0 top-0 h-full w-px"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.3) 30%, rgba(37,99,235,0.25) 70%, transparent 100%)",
          }}
        />

        {/* Floating particles */}
        <SidebarParticles />

        {/* ── Logo area ── */}
        <div className="relative flex items-center justify-between px-4 py-5 border-b border-border/60">
          <Link to="/dashboard" className="flex items-center gap-3 group flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.06, rotateY: 12 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{ perspective: 600 }}
            >
              <DishaLogo size={36} showText={false} animate3d={true} />
            </motion.div>
            <div className="overflow-hidden whitespace-nowrap">
              <span className="text-lg font-extrabold tracking-tight text-foreground">
                Disha
              </span>
              <span
                className="text-lg font-extrabold tracking-tight ml-1"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI
              </span>
            </div>
          </Link>

          {/* Close button inside sidebar */}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation Items ── */}
        <nav className="flex-1 flex flex-col gap-1.5 px-3 py-5 overflow-y-auto scrollbar-none">
          {navItems.map((item, idx) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            const isHovered = hoveredItem === item.name;

            return (
              <Nav3DItem key={item.name} isActive={isActive} delay={idx * 0.08 + 0.15}>
                <Link
                  to={item.path}
                  onClick={() => setCollapsed(true)} // Auto close sidebar on item click
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {/* Active / hover background */}
                  <AnimatePresence>
                    {(isActive || isHovered) && (
                      <motion.span
                        layoutId="sidebar-pill"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: isActive
                            ? "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(37,99,235,0.1) 100%)"
                            : "rgba(255,255,255,0.04)",
                          border: isActive
                            ? "1px solid rgba(124,58,237,0.22)"
                            : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isActive
                            ? "0 0 20px rgba(124,58,237,0.08)"
                            : "none",
                        }}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Active left indicator bar */}
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full"
                      style={{ background: "linear-gradient(180deg, #7C3AED, #2563EB)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}

                  {/* Icon */}
                  <motion.span
                    animate={isActive ? { scale: 1.18 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className="relative z-10 flex-shrink-0"
                  >
                    <Icon
                      className={`h-[18px] w-[18px] transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </motion.span>

                  {/* Label */}
                  <span className="relative z-10 whitespace-nowrap">
                    {item.name}
                  </span>

                  {/* Active sparkle */}
                  {isActive && (
                    <motion.span
                      className="ml-auto relative z-10"
                      animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                    </motion.span>
                  )}
                </Link>
              </Nav3DItem>
            );
          })}
        </nav>

        {/* ── Bottom Section ── */}
        <div className="relative flex flex-col gap-2 border-t border-border/60 px-3 py-4">
          {/* Sign out */}
          <motion.button
            onClick={handleSignOut}
            whileHover={{ scale: 1.03, x: 2 }}
            whileTap={{ scale: 0.96 }}
            disabled={signingOut}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive disabled:opacity-60"
          >
            <motion.span
              animate={signingOut ? { rotate: 360 } : {}}
              transition={signingOut ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
              className="flex-shrink-0"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </motion.span>
            <span className="whitespace-nowrap">
              {signingOut ? "Signing out…" : "Sign Out"}
            </span>
          </motion.button>
        </div>
      </motion.aside>

      {/* ── Main Layout Container (fills the screen) ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Sticky Top Header ─────────────────────────────────── */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="sticky top-0 z-30 w-full border-b border-border bg-card/75 backdrop-blur-xl"
        >
          {/* Subtle top glow line */}
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent 0%, #7C3AED55 30%, #2563EB55 70%, transparent 100%)" }}
          />

          <div className="flex h-16 items-center justify-between px-6 gap-4">
            
            {/* Left side: Menu toggle + Active page title */}
            <div className="flex items-center gap-4">
              <motion.button
                id="sidebar-toggle-header"
                ref={toggleBtnRef}
                onClick={() => setCollapsed(!collapsed)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                aria-label="Toggle Navigation"
              >
                <Menu className="h-5 w-5" />
              </motion.button>

              <h2 className="text-lg font-bold tracking-tight hidden sm:block">
                {getActivePageName()}
              </h2>
            </div>

            {/* Right side: User ID (Email tag), Notification Center, Theme Toggle, User Avatar */}
            <div className="flex items-center gap-3">
              
              {/* User ID Email Tag (Explicitly visible at the top) */}
              {user?.email && (
                <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-mono text-muted-foreground shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="max-w-[180px] truncate">{user.email}</span>
                </div>
              )}

              {/* Theme toggle */}
              <motion.button
                onClick={toggleTheme}
                whileHover={{ scale: 1.08, rotate: 15 }}
                whileTap={{ scale: 0.93 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={theme}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              {/* Notification Center */}
              <NotificationCenter />

              {/* User Profile / Avatar circle */}
              <div className="flex items-center gap-2 pl-3 border-l border-border ml-1">
                <motion.div
                  whileHover={{ scale: 1.08, rotateY: 15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-primary text-xs font-bold select-none cursor-default"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.12))",
                    border: "1.5px solid rgba(124,58,237,0.35)",
                    boxShadow: "0 0 12px rgba(124,58,237,0.2)",
                  }}
                >
                  {initial}
                  {/* Subtle pulsing ring */}
                  <motion.span
                    className="absolute inset-0 rounded-full border border-primary/30"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-foreground leading-tight max-w-[100px] truncate">
                    {name}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    Online
                  </span>
                </div>
              </div>

            </div>
          </div>
        </motion.header>

        {/* ── Main Content Area ── */}
        <motion.main
          className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {children}
        </motion.main>
      </div>

      {/* ── Floating AI Assistant ── */}
      <FloatingAIAssistant />

      <div aria-hidden className="sr-only">{user?.email}</div>
    </div>
  );
}
