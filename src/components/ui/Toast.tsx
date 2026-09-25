import React, { createContext, useCallback, useContext, useState } from 'react'

export interface ToastItem {
  id: number
  kind: 'success' | 'error' | 'info'
  title: string
  message?: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (kind: ToastItem['kind'], title: string, message?: string) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (kind: ToastItem['kind'], title: string, message?: string) => {
      const id = nextId++
      setToasts((prev) => [...prev.slice(-3), { id, kind, title, message }])
      window.setTimeout(() => dismissToast(id), 4500)
    },
    [dismissToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const kindStyles: Record<ToastItem['kind'], string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
}

const dotStyles: Record<ToastItem['kind'], string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
}

const titleStyles: Record<ToastItem['kind'], string> = {
  success: 'text-green-800',
  error: 'text-red-800',
  info: 'text-blue-800',
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 end-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-xl border p-3 shadow-lg transition-all ${kindStyles[toast.kind]}`}
        >
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotStyles[toast.kind]}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${titleStyles[toast.kind]}`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-0.5 text-xs text-slate-600">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
