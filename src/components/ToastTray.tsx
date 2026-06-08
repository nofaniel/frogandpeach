import type { Toast } from '../shared/api-types'

export function ToastTray({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-tray" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <span>{toast.message}</span>
          <button type="button" className="ghost" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
