import { Toast } from "primereact/toast";
import { createContext, ReactNode, useContext, useRef } from "react";

type ToastSeverity = "success" | "info" | "warn" | "error";

type AppToastContextType = {
  showToast: (
    severity: ToastSeverity,
    summary: string,
    detail: string
  ) => void;
};

const AppToastContext = createContext<AppToastContextType | null>(null);

export function AppToastProvider({ children }: { children: ReactNode }) {
  const toast = useRef<Toast>(null);

  const showToast = (
    severity: ToastSeverity,
    summary: string,
    detail: string
  ) => {
    toast.current?.show({
      severity,
      summary,
      detail,
      life: 3500,
    });
  };

  return (
    <AppToastContext.Provider value={{ showToast }}>
      <Toast ref={toast} position="top-right" />
      {children}
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error("useAppToast must be used inside AppToastProvider");
  }

  return context;
}