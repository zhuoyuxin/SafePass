import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30",
        className
      )}
      {...props}
    />
  );
}
