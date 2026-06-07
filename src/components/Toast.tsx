"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";

interface ToastState { id: number; message: string; icon: string }
interface ToastCtxValue { show: (message: string, icon?: string) => void }

const ToastCtx = createContext<ToastCtxValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, icon = "CircleCheck") => {
    counter.current += 1;
    setToast({ id: counter.current, message, icon });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <div key={toast.id} style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", zIndex: 1000, display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", background: "var(--elevated)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", borderRadius: "var(--r-md)", boxShadow: "var(--sh-lg)", animation: "fade-up .25s var(--ease)", maxWidth: "90vw" }}>
          <span style={{ color: "var(--green)", display: "inline-flex", flex: "none" }}><Icon name={toast.icon} size={20} /></span>
          <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastCtxValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) return { show: () => {} };
  return ctx;
}
