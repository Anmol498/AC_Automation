import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Link } from "react-router-dom";

// Standard cn helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface FloatingDockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  iconClassName?: string;
  active?: boolean;
}

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
  orientation = "horizontal",
  onIconInteract,
}: {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
  orientation?: "horizontal" | "vertical";
  /** Fired on pointerdown of any dock icon, before navigation. Used for the genie transition origin. */
  onIconInteract?: (rect: DOMRect) => void;
}) => {
  return (
    <>
      <FloatingDockDesktop
        items={items}
        className={desktopClassName}
        orientation={orientation}
        onIconInteract={onIconInteract}
      />
      <FloatingDockMobile items={items} className={mobileClassName} onIconInteract={onIconInteract} />
    </>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
  orientation = "horizontal",
  onIconInteract,
}: {
  items: FloatingDockItem[];
  className?: string;
  orientation?: "horizontal" | "vertical";
  onIconInteract?: (rect: DOMRect) => void;
}) => {
  let mousePosition = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => {
        if (orientation === "horizontal") {
          mousePosition.set(e.pageX);
        } else {
          mousePosition.set(e.pageY);
        }
      }}
      onMouseLeave={() => mousePosition.set(Infinity)}
      className={cn(
        "hidden md:flex gap-4 items-center bg-slate-900/90 border border-slate-800 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl z-45",
        orientation === "horizontal" ? "flex-row h-16" : "flex-col w-16",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer
          mousePosition={mousePosition}
          key={item.title}
          orientation={orientation}
          onIconInteract={onIconInteract}
          {...item}
        />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mousePosition,
  title,
  icon,
  href,
  onClick,
  orientation = "horizontal",
  iconClassName,
  active,
  onIconInteract,
}: FloatingDockItem & {
  mousePosition: any;
  orientation?: "horizontal" | "vertical";
  onIconInteract?: (rect: DOMRect) => void;
}) {
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mousePosition, (val: number) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 };
    if (orientation === "horizontal") {
      return val - bounds.x - bounds.width / 2;
    } else {
      return val - bounds.y - bounds.height / 2;
    }
  });

  // Map distance from mouse to size
  let sizeTransform = useTransform(distance, [-150, 0, 150], [40, 70, 40]);
  let size = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  const handlePointerDown = () => {
    if (onIconInteract && ref.current) {
      onIconInteract(ref.current.getBoundingClientRect());
    }
  };

  const content = (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      className={cn(
        "relative rounded-full flex items-center justify-center text-white cursor-pointer shadow-md transition-colors",
        active
          ? "bg-[var(--color-primary)] shadow-md shadow-blue-600/30"
          : "bg-slate-800 hover:bg-slate-700"
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: orientation === "horizontal" ? "-50%" : 0, y: orientation === "horizontal" ? 0 : "-50%" }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "absolute px-2.5 py-1.5 rounded-lg bg-slate-950 text-white border border-slate-800 text-xs font-medium whitespace-nowrap z-50 pointer-events-none shadow-xl",
              orientation === "horizontal"
                ? "bottom-full left-1/2 mb-3 -translate-x-1/2"
                : "left-full top-1/2 ml-3 -translate-y-1/2"
            )}
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <div className={cn("h-5 w-5 flex items-center justify-center", iconClassName)}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon as any, { parentSize: size })
          : icon}
      </div>
    </motion.div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="focus:outline-none bg-transparent border-none p-0 cursor-pointer">
        {content}
      </button>
    );
  }

  return (
    <Link to={href || "#"}>
      {content}
    </Link>
  );
}

const FloatingDockMobile = ({
  items,
  className,
  onIconInteract,
}: {
  items: FloatingDockItem[];
  className?: string;
  onIconInteract?: (rect: DOMRect) => void;
}) => {
  // Mobile horizontal floating dock centered at bottom of screen
  return (
    <div
      className={cn(
        "md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl z-50 max-w-[90vw] overflow-x-auto",
        className
      )}
    >
      {items.map((item) => {
        const content = (
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center text-white cursor-pointer shadow-md transition-all duration-205",
            item.active
              ? "bg-[var(--color-primary)] shadow-md shadow-blue-600/30 scale-105"
              : "bg-slate-800 hover:bg-slate-700"
          )}>
            <div className={cn("h-4 w-4 flex items-center justify-center", item.iconClassName)}>
              {React.isValidElement(item.icon)
                ? React.cloneElement(item.icon as any, { parentSize: undefined })
                : item.icon}
            </div>
          </div>
        );

        const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
          if (onIconInteract) {
            onIconInteract(e.currentTarget.getBoundingClientRect());
          }
        };

        if (item.onClick) {
          return (
            <button
              key={item.title}
              onClick={item.onClick}
              onPointerDown={handlePointerDown}
              className="focus:outline-none bg-transparent border-none p-0 cursor-pointer shrink-0"
              title={item.title}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={item.title}
            to={item.href || "#"}
            onPointerDown={handlePointerDown}
            className="shrink-0"
            title={item.title}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
};
