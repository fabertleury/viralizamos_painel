import React from "react";
import { cn } from "../../utils/cn";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
  variant?: "primary" | "secondary" | "white";
}

export function Spinner({
  className,
  size = "default",
  variant = "primary",
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  };

  const variantClasses = {
    primary: "border-primary/30 border-t-primary",
    secondary: "border-secondary/30 border-t-secondary",
    white: "border-white/30 border-t-white",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
} 