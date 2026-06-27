import clsx from "clsx";

export function Divider({ className }: { className?: string }) {
  return <hr className={clsx("codex-divider border-0", className)} />;
}