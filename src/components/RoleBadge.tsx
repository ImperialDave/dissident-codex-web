import { roleDisplayName, roleFromString } from "@/models";
import clsx from "clsx";

const ROLE_STYLES: Record<string, string> = {
  FOUNDER: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  ADMIN: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40",
  MOD: "bg-blue-500/20 text-blue-200 border-blue-500/40",
  USER: "bg-slate-400/25 text-slate-100 border-slate-300/50",
  SUSPENDED: "bg-orange-500/20 text-orange-200 border-orange-500/40",
  BANNED: "bg-red-500/20 text-red-200 border-red-500/40",
};

export function RoleBadge({ role }: { role: string }) {
  const r = roleFromString(role);
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        ROLE_STYLES[r] || ROLE_STYLES.USER
      )}
    >
      {roleDisplayName(r)}
    </span>
  );
}
