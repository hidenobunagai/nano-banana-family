import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5",
        ghost: "hover:bg-slate-800/50 text-slate-200 hover:text-white",
        outline:
          "border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200",
        glass:
          "bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 shadow-lg",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 rounded-full",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
