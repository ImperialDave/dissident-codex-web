import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "sm" | "md";
}

export function Input({ className, inputSize = "md", ...props }: InputProps) {
  return (
    <input
      className={clsx(
        "codex-input w-full rounded-full",
        inputSize === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        className
      )}
      {...props}
    />
  );
}