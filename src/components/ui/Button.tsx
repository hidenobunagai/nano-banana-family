import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 hover:shadow-blue-600/40 hover:-translate-y-0.5 border border-blue-200/50",
        ghost: "hover:bg-stone-100 text-stone-400 hover:text-stone-800",
        outline:
          "border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 text-stone-700 backdrop-blur-sm",
        glass:
          "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 shadow-lg hover:shadow-gray-400/10 hover:border-gray-300",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 rounded-full text-xs",
        lg: "h-14 px-8 text-base tracking-wide",
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
