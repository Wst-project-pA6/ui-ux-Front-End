import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  )
}

interface KPICardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  iconBg?: string
  subtitle?: string
}

export function KPICard({ title, value, change, changeType = 'neutral', icon, iconBg = 'bg-blue-50', subtitle }: KPICardProps) {
  const changeColor =
    changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-slate-500'

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
        )}
      </div>
      {change && (
        <p className={`text-xs font-medium ${changeColor}`}>
          {change}
        </p>
      )}
    </Card>
  )
}
