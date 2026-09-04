import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref" | "children" | "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> {
  variant?: "primary" | "ghost" | "glass";
  children: ReactNode;
}

export function MagneticButton({ children, className, variant = "primary", ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 18 });
  const sy = useSpring(my, { stiffness: 200, damping: 18 });

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = ref.current?.getBoundingClientRect();
    if (!b) return;
    mx.set((e.clientX - (b.left + b.width / 2)) * 0.3);
    my.set((e.clientY - (b.top + b.height / 2)) * 0.3);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const base = "relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold tracking-wide transition-colors will-change-transform";
  const variants = {
    primary: "text-white shadow-[0_10px_40px_-10px_rgba(139,92,246,0.7)] gradient-aurora-bg hover:brightness-110",
    ghost: "border border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur",
    glass: "glass-strong text-foreground hover:bg-white/85",
  } as const;

  return (
    <motion.button
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(base, variants[variant], className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
