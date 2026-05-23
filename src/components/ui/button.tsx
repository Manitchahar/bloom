import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-sage to-sage-light text-white shadow-[0_8px_24px_rgba(125,155,118,0.25)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_12px_32px_rgba(125,155,118,0.35)]",
        secondary: "border border-[rgba(91,122,84,0.24)] bg-white text-[var(--text-secondary)] shadow-sm hover:-translate-y-0.5 hover:border-sage hover:text-sage dark:bg-[var(--bg-secondary)]",
        outline: "border border-[rgba(91,122,84,0.24)] bg-transparent hover:-translate-y-0.5 hover:bg-sage-pale hover:text-sage",
        ghost: "hover:bg-sage-pale hover:text-sage",
        destructive: "bg-terracotta text-white hover:bg-terracotta-light",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
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
