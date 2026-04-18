import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, string> = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

const colors: Record<ToastType, string> = {
  success: "#22c55e",
  error: "#ef4444",
  info: "#3b82f6",
  warning: "#f59e0b",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
          width: "90%",
          maxWidth: "400px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: "#1a1a2e",
              border: `1px solid ${colors[toast.type]}`,
              borderLeft: `4px solid ${colors[toast.type]}`,
              borderRadius: "12px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
              animation: "slideIn 0.3s ease",
              pointerEvents: "auto",
              direction: "rtl",
            }}
          >
            <span style={{ fontSize: "18px" }}>{icons[toast.type]}</span>
            <span style={{ color: "white", fontSize: "14px", fontWeight: "500" }}>
              {toast.message}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
