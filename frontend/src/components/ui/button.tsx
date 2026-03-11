import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-[#0a6171] border border-primary",
  secondary:
    "bg-white text-foreground border border-slate-300 hover:bg-slate-50",
  danger: "bg-danger text-white border border-danger hover:bg-red-800",
  ghost: "bg-transparent text-foreground border border-transparent hover:bg-slate-100"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
        variantMap[variant],
        className
      )}
      {...props}
    />
  );
}
