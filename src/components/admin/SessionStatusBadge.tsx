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
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: colour }}
    >
      {myLabel}
      <span className="opacity-75">/ {enLabel}</span>
    </span>
  );
}
