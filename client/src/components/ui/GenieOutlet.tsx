import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";
import { useGenie } from "../../context/GenieContext";

// Genie warp: squashed + skewed + transparent at the icon, full size/opacity in place.
const GENIE_VARIANTS: Variants = {
  initial: { opacity: 0, scaleX: 0.3, scaleY: 0.05, skewY: -10 },
  animate: {
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    skewY: 0,
    transition: { duration: 0.4, ease: [0.65, 0, 0.35, 1] },
  },
  exit: {
    opacity: 0,
    scaleX: 0.3,
    scaleY: 0.05,
    skewY: 10,
    transition: { duration: 0.4, ease: [0.65, 0, 0.35, 1] },
  },
};

// Matches the original `animate-in fade-in slide-in-from-bottom-2 duration-200` behavior.
// Used when: sidebar expanded, reduced-motion preferred, or the feature flag is off.
const FALLBACK_VARIANTS: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

interface GenieOutletProps {
  isCollapsed: boolean;
  outletContext: unknown;
}

export const GenieOutlet: React.FC<GenieOutletProps> = ({ isCollapsed, outletContext }) => {
  const location = useLocation();
  // IMPORTANT: useOutlet() snapshots the matched route element for THIS render pass.
  // Rendering <Outlet /> directly inside the animated wrapper is reactive — it swaps
  // to the new page immediately on navigation, even inside the node that's supposed
  // to be playing the OLD page's exit animation. That's what caused "content pops in,
  // then the animation plays after." Framer Motion holds onto the last-rendered
  // children for an exiting node, so capturing the element here freezes the correct
  // (old) content during exit.
  const element = useOutlet(outletContext);
  const { origin, enabled } = useGenie();
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const useGenieEffect = isCollapsed && enabled && !prefersReducedMotion && !!origin;

  // Recompute transform-origin (in % relative to the outlet container) whenever
  // a dock icon is clicked, so the warp points at the exact icon.
  useEffect(() => {
    if (!useGenieEffect || !origin || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ox = ((origin.x - rect.left) / rect.width) * 100;
    const oy = ((origin.y - rect.top) / rect.height) * 100;
    setTransformOrigin(`${ox}% ${oy}%`);
    // Recompute per-navigation too, in case of layout shifts between routes.
  }, [origin, useGenieEffect, location.pathname]);

  const variants = useGenieEffect ? GENIE_VARIANTS : FALLBACK_VARIANTS;

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ transformOrigin, willChange: "transform, opacity" }}
          className="w-full h-full"
        >
          {element}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
