import { cva, type VariantProps } from 'class-variance-authority';
import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] cursor-pointer whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-accent)] text-white shadow-md hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-[var(--color-accent)] border border-transparent",
        secondary: "bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]/15 focus-visible:ring-[var(--color-primary)] border border-transparent",
        outline: "border border-slate-300 dark:border-[var(--color-border-dark)] text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-[var(--color-card-dark)] focus-visible:ring-[var(--color-primary)]",
        ghost: "text-slate-600 dark:text-zinc-400 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] focus-visible:ring-[var(--color-primary)] border border-transparent",
        destructive: "bg-[var(--color-danger)] text-white hover:bg-red-700 shadow-md focus-visible:ring-red-500 border border-transparent",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <i className="fa-solid fa-circle-notch fa-spin mr-1" />}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
