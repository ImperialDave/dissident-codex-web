import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "accent" | "secondary" | "ghost" | "danger" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

const variantClass: Record<ButtonVariant, string> = {
  accent: "codex-btn-accent",
  secondary: "codex-btn-secondary",
  ghost: "codex-btn-ghost",
  danger: "codex-btn-danger",
  icon: "codex-btn-icon",
};

const sizeClass: Record<"sm" | "md" | "lg", string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  variant = "ghost",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "rounded-full transition disabled:cursor-not-allowed",
        variant !== "icon" && variantClass[variant],
        variant !== "icon" && sizeClass[size],
        variant === "icon" && "codex-btn-icon",
        className
      )}
      {...props}
    />
  );
}