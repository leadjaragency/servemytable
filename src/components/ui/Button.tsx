"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 font-sans font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shrink-0 select-none",
  {
    variants: {
      variant: {
        // Primary — Flame Orange, Parchment text, heat-glow on hover
        primary:
          "bg-[#FF4D00] text-[#FAF6ED] hover:bg-[#FF6A33] hover:shadow-[0_8px_24px_-4px_rgba(255,77,0,0.5)] active:bg-[#C23A00] focus-visible:ring-[#FF4D00]/50 shadow-sm font-semibold",
        secondary:
          "bg-white/5 text-current hover:bg-white/10 active:bg-white/15 focus-visible:ring-white/30 border border-white/10",
        outline:
          "border border-current bg-transparent hover:bg-white/5 active:bg-white/10 focus-visible:ring-current",
        ghost:
          "bg-transparent border border-white/15 text-[#FAF6ED]/70 hover:bg-white/5 hover:text-[#FAF6ED] hover:border-white/25 active:bg-white/10 focus-visible:ring-white/20",
        danger:
          "bg-[#93000A] text-[#FFDAD6] hover:bg-[#B3000C] active:bg-[#690005] focus-visible:ring-[#FFB4AB]/50 shadow-sm",
        // Champagne Gold — secondary premium action (transparent + gold border)
        amber:
          "bg-transparent text-[#C6A34E] border border-[#C6A34E] hover:bg-[#C6A34E]/10 active:bg-[#C6A34E]/15 focus-visible:ring-[#C6A34E]/50 font-semibold",
        // Customer-zone warm accent — Flame Orange
        warm:
          "bg-[#FF4D00] text-[#FAF6ED] hover:bg-[#FF6A33] hover:shadow-[0_8px_24px_-4px_rgba(255,77,0,0.5)] active:bg-[#C23A00] focus-visible:ring-[#FF4D00] shadow-sm font-semibold",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-sm",
        md: "h-10 px-4 text-sm rounded-md",
        lg: "h-12 px-6 text-base rounded-md",
        icon: "h-9 w-9 rounded-md",
        "icon-sm": "h-7 w-7 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
