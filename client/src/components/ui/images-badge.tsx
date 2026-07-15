import React from 'react';
import { motion } from 'framer-motion';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ImagesBadgeProps {
  hasDrawing: boolean;
  hasQuotation: boolean;
  drawingUrl?: string;
  quotationUrl?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const ImagesBadge: React.FC<ImagesBadgeProps> = ({
  hasDrawing,
  hasQuotation,
  drawingUrl,
  quotationUrl,
  className,
  onClick
}) => {
  const count = (hasDrawing ? 1 : 0) + (hasQuotation ? 1 : 0);

  // Determine positions based on how many files exist
  const getDrawingVariants = () => {
    if (!hasDrawing) return { initial: { opacity: 0 }, hover: { opacity: 0 } };
    if (count === 1) {
      // Only drawing is uploaded, center it
      return {
        initial: { y: 0, x: 0, rotate: 0, scale: 0.8, opacity: 0.9 },
        hover: { y: -24, x: 0, rotate: 0, scale: 1.1, opacity: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 14 } }
      };
    }
    // Both uploaded, fan left
    return {
      initial: { y: 0, x: 0, rotate: 0, scale: 0.8, opacity: 0.9 },
      hover: { y: -24, x: -22, rotate: -15, scale: 1.1, opacity: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 14 } }
    };
  };

  const getQuotationVariants = () => {
    if (!hasQuotation) return { initial: { opacity: 0 }, hover: { opacity: 0 } };
    if (count === 1) {
      // Only quotation is uploaded, center it
      return {
        initial: { y: 0, x: 0, rotate: 0, scale: 0.8, opacity: 0.9 },
        hover: { y: -24, x: 0, rotate: 0, scale: 1.1, opacity: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 14 } }
      };
    }
    // Both uploaded, fan right
    return {
      initial: { y: 0, x: 0, rotate: 0, scale: 0.8, opacity: 0.9 },
      hover: { y: -24, x: 22, rotate: 15, scale: 1.1, opacity: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 14 } }
    };
  };

  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center cursor-pointer select-none",
        className
      )}
    >
      {/* Folder Container */}
      <div className="relative w-12 h-10 flex items-center justify-center shrink-0">
        
        {/* Card 1: Drawing (Left/Center Card) */}
        {hasDrawing && (
          <motion.div
            variants={getDrawingVariants()}
            className="absolute w-8 h-10 bg-white dark:bg-zinc-800 rounded shadow-md overflow-hidden pointer-events-none"
            style={{ zIndex: 11 }}
          >
            {drawingUrl && !drawingUrl.toLowerCase().endsWith('.pdf') ? (
              <img 
                src={drawingUrl} 
                alt="drawing" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.fallback-icon');
                    if (fallback) fallback.classList.remove('hidden');
                  }
                }}
              />
            ) : null}

            {/* Fallback Drawing Sheet layout */}
            <div className={cn(
              "w-full h-full flex flex-col justify-between p-1 transition-all duration-200",
              drawingUrl && !drawingUrl.toLowerCase().endsWith('.pdf') ? "fallback-icon hidden absolute inset-0" : "",
              "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900"
            )}>
              <div className="flex justify-between items-center">
                <span className="text-[5px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                  DWG
                </span>
                <i className="fa-solid fa-file-image text-[8px] text-emerald-500"></i>
              </div>
              <div className="space-y-0.5">
                <div className="h-0.5 w-4 rounded-full bg-emerald-200 dark:bg-emerald-800" />
                <div className="h-0.5 w-5 rounded-full bg-emerald-200 dark:bg-emerald-800" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Card 2: Quotation (Right/Center Card) */}
        {hasQuotation && (
          <motion.div
            variants={getQuotationVariants()}
            className="absolute w-8 h-10 bg-white dark:bg-zinc-800 rounded shadow-md overflow-hidden pointer-events-none"
            style={{ zIndex: 12 }}
          >
            {/* Quotation Layout */}
            <div className="w-full h-full flex flex-col justify-between p-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
              <div className="flex justify-between items-center">
                <span className="text-[5px] font-black uppercase text-blue-600 dark:text-blue-400">
                  QUOT
                </span>
                <i className="fa-solid fa-file-pdf text-[8px] text-blue-500"></i>
              </div>
              <div className="space-y-0.5">
                <div className="h-0.5 w-4 rounded-full bg-blue-200 dark:bg-blue-800" />
                <div className="h-0.5 w-5 rounded-full bg-blue-200 dark:bg-blue-800" />
              </div>
            </div>
          </motion.div>
        )}

        {/* SVG Folder - Back Panel */}
        <svg 
          width="48" 
          height="40" 
          viewBox="0 0 48 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="absolute inset-0 z-0 drop-shadow-sm pointer-events-none"
        >
          <path 
            d="M4 8C4 6.89543 4.89543 6 6 6H17.5858C18.1162 6 18.6249 6.21071 19 6.58579L23.4142 11H42C43.1046 11 44 11.8954 44 13V34C44 35.1046 42.1046 36 41 36H7C5.89543 36 4 35.1046 4 34V8Z" 
            fill="#FBBF24" 
          />
        </svg>

        {/* SVG Folder - Front Cover (Rotates open slightly on hover) */}
        <motion.div
          variants={{
            initial: { rotateX: 0, y: 0 },
            hover: { rotateX: -20, y: 2 }
          }}
          style={{ originY: 1 }}
          className="absolute inset-0 z-20 pointer-events-none"
        >
          <svg 
            width="48" 
            height="40" 
            viewBox="0 0 48 40" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M4 14C4 12.8954 4.89543 12 6 12H42C43.1046 12 44 12.8954 44 14V34C44 35.1046 43.1046 36 42 36H6C4.89543 36 4 35.1046 4 34V14Z" 
              fill="#F59E0B" 
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
};
