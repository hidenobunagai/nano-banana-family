import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[24px] text-oln-16 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563eb] text-white border border-[#2563eb] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#1d4ed8] hover:border-[#1d4ed8]",
        secondary:
          "bg-white text-[#111827] border border-[#d1d5db] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#f3f4f6] hover:border-[#9ca3af]",
        ghost: "bg-transparent text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827]",
        outline:
          "bg-white text-[#374151] border border-[#d1d5db] hover:bg-[#f3f4f6] hover:border-[#9ca3af]",
        danger:
          "bg-[#991b1b] text-white border border-[#991b1b] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#7f1d1d] hover:border-[#7f1d1d]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 rounded-[20px] text-oln-14",
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
