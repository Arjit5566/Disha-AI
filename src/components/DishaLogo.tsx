import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";

interface DishaLogoProps {
  /** Show the text "Disha AI" + tagline beside the icon */
  showText?: boolean;
  /** Size of the D-icon in pixels */
  size?: number;
  /** Dark mode override (for auth/landing dark backgrounds) */
  dark?: boolean;
  className?: string;
  /** If true, runs a continuous 3D float animation on the icon */
  animate3d?: boolean;
}

/**
 * Animated Disha AI logo with 3D rotation and glow effects.
 */
export function DishaLogo({
  showText = true,
  size = 44,
  dark = false,
  className = "",
  animate3d = true,
}: DishaLogoProps) {
  const textColor = dark ? "#FFFFFF" : "#111827";
  const subColor = dark ? "rgba(255,255,255,0.65)" : "#6B7280";

  // 3D tilt values driven by time
  const rotateY = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const timeRef = useRef(0);

  useAnimationFrame((t) => {
    if (!animate3d) return;
    timeRef.current = t / 1000;
    // Gentle figure-8 oscillation
    rotateY.set(Math.sin(timeRef.current * 0.8) * 18);
    rotateX.set(Math.sin(timeRef.current * 0.5) * 10);
  });

  // Shadow intensity follows rotation
  const shadowBlur = useTransform(rotateY, [-18, 0, 18], [6, 28, 6]);
  const shadowOpacity = useTransform(rotateY, [-18, 0, 18], [0.2, 0.55, 0.2]);

  return (
    <div className={`flex items-center gap-4 ${className}`} style={{ perspective: 600 }}>
      {/* ── 3D Icon Mark ── */}
      <motion.div
        style={{
          rotateY: animate3d ? rotateY : 0,
          rotateX: animate3d ? rotateX : 0,
          transformStyle: "preserve-3d",
          width: size,
          height: size,
          flexShrink: 0,
        }}
        initial={{ scale: 0.6, opacity: 0, rotateY: -40 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 120 }}
      >
        {/* Glow halo behind icon */}
        <motion.div
          style={{
            position: "absolute",
            inset: -size * 0.2,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 70%)",
            filter: `blur(${size * 0.3}px)`,
            opacity: shadowOpacity,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }}
        >
          <defs>
            <linearGradient id="disha-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="60%" stopColor="#6D28D9" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="disha-shine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <filter id="disha-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#7C3AED" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* ── Outer D body ── */}
          <motion.path
            d="M22 14 L22 106 L58 106 C88 106 104 87 104 60 C104 33 88 14 58 14 Z"
            fill="url(#disha-main)"
            filter="url(#disha-shadow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
          />

          {/* ── Shine overlay on D ── */}
          <motion.path
            d="M22 14 L22 62 L58 62 C88 62 104 46 104 33 C104 22 94 14 80 14 Z"
            fill="url(#disha-shine)"
            opacity={0.6}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          />

          {/* ── Inner cut-out (white) ── */}
          <motion.path
            d="M36 28 L36 92 L57 92 C78 92 90 78 90 60 C90 42 78 28 57 28 Z"
            fill="white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          />

          {/* ── Pixel dots ── */}
          <motion.rect x="22" y="100" width="12" height="12" rx="3"
            fill="url(#disha-main)"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 250 }}
            style={{ transformOrigin: "28px 106px" }}
          />
          <motion.rect x="37" y="102" width="9" height="9" rx="2.5"
            fill="url(#disha-main)" opacity={0.75}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 250 }}
            style={{ transformOrigin: "41px 107px" }}
          />
          <motion.rect x="50" y="104" width="6" height="6" rx="1.5"
            fill="url(#disha-main)" opacity={0.5}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 1.0, type: "spring", stiffness: 250 }}
            style={{ transformOrigin: "53px 107px" }}
          />

          {/* ── Star sparkle ── */}
          <motion.g
            initial={{ scale: 0, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.6, type: "spring", stiffness: 200 }}
            style={{ transformOrigin: "63px 60px" }}
          >
            {/* Pulse ring */}
            <motion.circle cx="63" cy="60" r="14"
              fill="none" stroke="#7C3AED" strokeWidth="1.5"
              animate={{ r: [11, 20, 11], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Second pulse ring (offset) */}
            <motion.circle cx="63" cy="60" r="9"
              fill="none" stroke="#2563EB" strokeWidth="1"
              animate={{ r: [8, 17, 8], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            />
            {/* Star */}
            <path
              d="M63 45 L66.5 57.5 L79 60 L66.5 62.5 L63 75 L59.5 62.5 L47 60 L59.5 57.5 Z"
              fill="#7C3AED"
            />
            {/* Star inner highlight */}
            <path
              d="M63 50 L65.2 58.8 L74 60 L65.2 61.2 L63 70 L60.8 61.2 L52 60 L60.8 58.8 Z"
              fill="white" opacity={0.4}
            />
          </motion.g>
        </svg>
      </motion.div>

      {/* ── Wordmark + Tagline ── */}
      {showText && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.6, type: "spring" }}
          className="leading-none"
        >
          {/* "Disha AI" */}
          <div className="flex items-baseline gap-2">
            <span
              className="font-extrabold tracking-tight"
              style={{
                fontSize: Math.max(size * 0.6, 22),
                color: textColor,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              Disha
            </span>
            <span
              className="font-extrabold tracking-tight"
              style={{
                fontSize: Math.max(size * 0.6, 22),
                lineHeight: 1,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AI
            </span>
          </div>

          {/* Tagline */}
          <motion.span
            className="mt-1.5 block font-semibold uppercase tracking-widest"
            style={{
              fontSize: Math.max(size * 0.24, 11),
              color: subColor,
              lineHeight: 1.5,
              letterSpacing: "0.16em",
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Guiding Careers Through Intelligence
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}
