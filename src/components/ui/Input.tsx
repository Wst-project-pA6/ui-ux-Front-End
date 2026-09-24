import React, { useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
  required?: boolean
}

export function Input({
  label,
  error,
  hint,
  prefixIcon,
  suffixIcon,
  required,
  className = '',
  id,
  ...props
}: InputProps) {
  const uid = useId()
  const inputId = id ?? uid
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  const describedBy = [
    error ? errorId : null,
    hint && !error ? hintId : null,
  ].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ms-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {prefixIcon && (
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {prefixIcon}
          </span>
        )}
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full h-9 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-slate-200'
          } ${prefixIcon ? 'ps-9' : 'ps-3'} ${suffixIcon ? 'pe-9' : 'pe-3'} ${className}`}
          {...props}
        />
        {suffixIcon && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {suffixIcon}
          </span>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p id={hintId} className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  required?: boolean
}

export function Select({ label, error, options, required, className = '', id, ...props }: SelectProps) {
  const uid = useId()
  const selectId = id ?? uid
  const errorId = `${selectId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ms-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full h-9 px-3 border rounded-lg text-sm text-slate-900 bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed ${
          error ? 'border-red-400' : 'border-slate-200'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  required?: boolean
}

export function Textarea({ label, error, required, className = '', id, ...props }: TextareaProps) {
  const uid = useId()
  const textareaId = id ?? uid
  const errorId = `${textareaId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ms-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
          error ? 'border-red-400' : 'border-slate-200'
        } ${className}`}
        {...props}
      />
      {error && <p id={errorId} role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
