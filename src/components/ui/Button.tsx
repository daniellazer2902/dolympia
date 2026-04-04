import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'orange' | 'rose' | 'yellow' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  orange: 'bg-fiesta-orange text-white shadow-btn-orange hover:brightness-105 active:translate-y-1 active:shadow-none',
  rose:   'bg-fiesta-rose   text-white shadow-btn-rose   hover:brightness-105 active:translate-y-1 active:shadow-none',
  yellow: 'bg-fiesta-yellow text-gray-800 shadow-btn-yellow hover:brightness-105 active:translate-y-1 active:shadow-none',
  outline:'bg-white border-2 border-fiesta-orange text-fiesta-orange hover:bg-fiesta-orange hover:text-white',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function Button({ variant = 'orange', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'font-bold rounded-full transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
