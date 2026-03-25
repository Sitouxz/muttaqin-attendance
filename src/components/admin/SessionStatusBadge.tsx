import { SESSION_STATUS_LABELS, type SessionStatus } from "@/lib/utils/constants";

interface SessionStatusBadgeProps {
  status: string;
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const label = SESSION_STATUS_LABELS[status as SessionStatus];
  const colour = label?.colour ?? "#6B7280";
  const myLabel = label?.my ?? status;
  const enLabel = label?.en ?? status;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
      style={{ backgroundColor: colour }}
      title={enLabel}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
      {myLabel}
    </span>
  );
}
