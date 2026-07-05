import React, { createContext, useCallback, useContext, useState } from "react";

interface GenieOrigin {
  x: number;
  y: number;
}

interface GenieContextValue {
  /** Viewport coordinates of the last-clicked dock icon */
  origin: GenieOrigin | null;
  /** Called by the dock on pointerdown, before navigation happens */
  setOrigin: (rect: DOMRect) => void;
  /** Master on/off switch, backed by localStorage so it can be disabled without a deploy */
  enabled: boolean;
}

const GenieContext = createContext<GenieContextValue | null>(null);

const FLAG_KEY = "genie-effect-enabled";

export const GenieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [origin, setOriginState] = useState<GenieOrigin | null>(null);

  // Default ON. Set localStorage.setItem('genie-effect-enabled', 'false') to kill-switch it.
  const enabled =
    typeof window === "undefined" || localStorage.getItem(FLAG_KEY) !== "false";

  const setOrigin = useCallback((rect: DOMRect) => {
    setOriginState({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, []);

  return (
    <GenieContext.Provider value={{ origin, setOrigin, enabled }}>
      {children}
    </GenieContext.Provider>
  );
};

export function useGenie() {
  const ctx = useContext(GenieContext);
  if (!ctx) {
    throw new Error("useGenie() must be called within a <GenieProvider>");
  }
  return ctx;
}
