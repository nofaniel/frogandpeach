import { useId, useState, type ReactNode } from 'react'

export function InfoTooltip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span
      className={`info-tooltip${className ? ' ' + className : ''}${open ? ' info-tooltip--open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <span
        className="info-tooltip-trigger"
        tabIndex={0}
        role="button"
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>
      {open && (
        <span className="info-tooltip-bubble" id={id} role="tooltip">
          {label}
        </span>
      )}
    </span>
  )
}
