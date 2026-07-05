import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useGenie } from "../../context/GenieContext";

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scaleX: 0.9, scaleY: 0.9 },
  visible: {
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    skewY: 0,
    transition: { duration: 0.15 },
  },
  collapse: {
    opacity: 0,
    scaleX: 0.25,
    scaleY: 0.05,
    skewY: 10,
    transition: { duration: 0.4, ease: [0.65, 0, 0.35, 1] },
  },
};

interface LogoutOverlayProps {
  active: boolean;
}

// Total on-screen time: ~150ms enter + ~250ms hold + ~400ms collapse ≈ 650ms.
// Layout.tsx's handleLogout should delay the real logout() call to match.
export const LogoutOverlay: React.FC<LogoutOverlayProps> = ({ active }) => {
  const { origin } = useGenie();
  const [phase, setPhase] = useState<"visible" | "collapse">("visible");

  useEffect(() => {
    if (!active) {
      setPhase("visible");
      return;
    }
    const t = setTimeout(() => setPhase("collapse"), 250);
    return () => clearTimeout(t);
  }, [active]);

  // Overlay is position:fixed, so origin (viewport px) can be used directly
  // as the transform-origin without any container-relative math.
  const transformOrigin = origin ? `${origin.x}px ${origin.y}px` : "50% 50%";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-8 py-6 shadow-2xl"
            style={{ transformOrigin }}
            variants={cardVariants}
            initial="hidden"
            animate={phase}
          >
            <div className="w-6 h-6 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
            <span className="text-sm text-slate-300 font-medium">Logging out…</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
