import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-mono text-xs uppercase tracking-[0.2em] transition-colors duration-200",
        variant === "default" &&
          "bg-flame text-ink px-8 py-4 hover:bg-bone",
        variant === "outline" &&
          "border border-ash text-ash px-8 py-4 hover:border-bone hover:text-bone",
        variant === "ghost" &&
          "text-ash hover:text-bone",
        className,
      )}
      {...props}
    />
  );
}

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
