import * as React from "react";
import { cn } from "../../lib/utils"; // helper for conditional classes (optional)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const baseClasses =
      "px-4 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants: Record<string, string> = {
      default:
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      outline:
        "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
    };

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
