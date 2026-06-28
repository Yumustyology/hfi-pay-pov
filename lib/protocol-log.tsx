"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProtocolStepStatus = "pending" | "active" | "done" | "error";

export interface ProtocolStep {
  id: string;
  label: string;
  status: ProtocolStepStatus;
  timestamp?: string;
  /** Extra detail shown below label, e.g. relay name or txHash snippet */
  detail?: string;
}

interface ProtocolLogContextValue {
  steps: ProtocolStep[];
  /** Add or replace a step by id */
  pushStep: (step: ProtocolStep) => void;
  /** Partially update an existing step by id */
  updateStep: (id: string, patch: Partial<Omit<ProtocolStep, "id">>) => void;
  /** Reset all steps (call when starting a fresh payment flow) */
  clearSteps: () => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProtocolLogContext = createContext<ProtocolLogContextValue | null>(null);

export function ProtocolLogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [steps, setSteps] = useState<ProtocolStep[]>([]);
  const [isOpen, setOpen] = useState(false);

  const pushStep = useCallback((step: ProtocolStep) => {
    setSteps((prev) => {
      const existing = prev.findIndex((s) => s.id === step.id);
      if (existing !== -1) {
        const next = [...prev];
        next[existing] = { ...next[existing], ...step };
        return next;
      }
      return [...prev, { ...step, timestamp: new Date().toLocaleTimeString() }];
    });
  }, []);

  const updateStep = useCallback(
    (id: string, patch: Partial<Omit<ProtocolStep, "id">>) => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                ...patch,
                timestamp: patch.timestamp ?? new Date().toLocaleTimeString(),
              }
            : s
        )
      );
    },
    []
  );

  const clearSteps = useCallback(() => setSteps([]), []);

  return (
    <ProtocolLogContext.Provider
      value={{ steps, pushStep, updateStep, clearSteps, isOpen, setOpen }}
    >
      {children}
    </ProtocolLogContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProtocolLog() {
  const ctx = useContext(ProtocolLogContext);
  if (!ctx) {
    throw new Error("useProtocolLog must be used inside ProtocolLogProvider");
  }
  return ctx;
}
