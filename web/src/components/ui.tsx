import { cn, initials } from "@/lib/utils";
import {
  CONTENT_STATUS_COLORS,
  CONTENT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from "@/lib/constants";

export function StatusBadge({
  status,
  kind = "content",
}: {
  status: string;
  kind?: "content" | "project";
}) {
  const color =
    kind === "content"
      ? CONTENT_STATUS_COLORS[status] ?? "#6b6b6b"
      : PROJECT_STATUS_COLORS[status] ?? "#6b6b6b";
  const label =
    kind === "content"
      ? CONTENT_STATUS_LABELS[status] ?? status
      : PROJECT_STATUS_LABELS[status] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}14`, color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

export function Avatar({
  name,
  color = "#111111",
  size = 28,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border bg-[var(--surface)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 active:scale-[0.98]",
    secondary:
      "border bg-[var(--bg)] text-[var(--fg)] hover:bg-[var(--surface-2)] active:scale-[0.98]",
    ghost: "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]",
    danger: "border border-[#C0442E]/30 text-[#C0442E] hover:bg-[#C0442E]/10",
  };
  return (
    <button
      type={type}
      className={cn(
        "transition-quiet inline-flex items-center justify-center gap-2 rounded-[var(--radius-input)] px-4 py-2 text-sm font-medium disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed py-16 text-center">
      <p className="font-display text-2xl">{title}</p>
      {hint && <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {children}
    </p>
  );
}
