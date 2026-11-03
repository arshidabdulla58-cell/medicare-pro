import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const buttonStyles = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'button-primary bg-teal-700 text-white shadow-sm hover:-translate-y-0.5 hover:bg-teal-800',
        secondary: 'border border-slate-200 bg-white text-slate-800 hover:border-teal-200 hover:bg-teal-50',
        ghost: 'text-slate-700 hover:bg-slate-100',
      },
      size: { default: 'min-h-11', small: 'min-h-9 rounded-lg px-3 text-xs', large: 'min-h-13 px-6' },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
