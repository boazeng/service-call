import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Toast = { id: number; text: string; kind: 'ok' | 'err' }
type ToastState = { notify: (text: string, kind?: 'ok' | 'err') => void }

const ToastCtx = createContext<ToastState | null>(null)
let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = nextId++
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="tact-chip"
            style={{
              padding: '10px 16px',
              fontSize: '0.85rem',
              boxShadow: 'var(--shadow-md)',
              background: t.kind === 'ok' ? 'var(--color-pos-soft)' : 'rgba(214,74,46,0.12)',
              color: t.kind === 'ok' ? 'var(--color-pos)' : 'var(--color-accent)',
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
