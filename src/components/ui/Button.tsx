import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius-lg)] text-oln-16 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] focus-visible:ring-offset-2 disabled:cursor-not-allowed active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-600)] text-white border border-[var(--color-primary-600)] shadow-[var(--shadow-level-1)] hover:bg-[var(--color-primary-700)] hover:border-[var(--color-primary-700)] disabled:bg-[var(--color-primary-300)] disabled:border-[var(--color-primary-300)] disabled:text-white",
        secondary:
          "bg-white text-[var(--color-neutral-900)] border border-[var(--color-neutral-300)] shadow-[var(--shadow-level-1)] hover:bg-[var(--color-neutral-100)] hover:border-[var(--color-neutral-400)] disabled:bg-[var(--color-neutral-50)] disabled:text-[var(--color-neutral-400)] disabled:border-[var(--color-neutral-200)]",
        ghost:
          "bg-transparent text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)] disabled:text-[var(--color-neutral-400)]",
        outline:
          "bg-white text-[var(--color-neutral-700)] border border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-100)] hover:border-[var(--color-neutral-400)] disabled:text-[var(--color-neutral-400)] disabled:border-[var(--color-neutral-200)]",
        danger:
          "bg-[var(--color-error-dark)] text-white border border-[var(--color-error-dark)] shadow-[var(--shadow-level-1)] hover:brightness-90 disabled:opacity-70",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 rounded-[var(--radius-md)] text-oln-14",
        lg: "h-14 px-8 text-oln-17",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
